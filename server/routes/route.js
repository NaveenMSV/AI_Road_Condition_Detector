/**
 * Route Analysis Routes
 * Handles route planning with road issue warnings
 * Uses OSRM (Open Source Routing Machine) for free route calculation
 */

const express = require('express');
const axios = require('axios');
const Issue = require('../models/Issue');

const router = express.Router();

/**
 * POST /api/route-analysis
 * Analyze a route for road issues
 * Input: source {lat, lng}, destination {lat, lng}
 * Output: route geometry, issue counts, warnings
 */
router.post('/route-analysis', async (req, res) => {
  try {
    const { source, destination } = req.body;

    if (!source?.lat || !source?.lng || !destination?.lat || !destination?.lng) {
      return res.status(400).json({ error: 'Source and destination coordinates are required' });
    }

    // Fetch route from OSRM (free, no API key needed)
    let routeData = null;
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${source.lng},${source.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
      
      const osrmResponse = await axios.get(osrmUrl, { timeout: 10000 });
      routeData = osrmResponse.data;
    } catch (osrmError) {
      console.warn('⚠️  OSRM routing failed:', osrmError.message);
      // Generate a simple straight-line route as fallback
      routeData = {
        routes: [{
          geometry: {
            type: 'LineString',
            coordinates: [
              [source.lng, source.lat],
              [destination.lng, destination.lat]
            ]
          },
          distance: calculateDistance(source.lat, source.lng, destination.lat, destination.lng),
          duration: 0,
          legs: []
        }]
      };
    }

    // Find issues along the primary route
    const routes = routeData.routes || [];
    const analyzedRoutes = [];

    for (let i = 0; i < Math.min(routes.length, 3); i++) {
      const route = routes[i];
      const coords = route.geometry?.coordinates || [];
      
      // Find issues within buffer distance of the route
      const issuesAlongRoute = await findIssuesAlongRoute(coords, 200); // 200m buffer

      const potholes = issuesAlongRoute.filter(i => i.type === 'pothole').length;
      const bumps = issuesAlongRoute.filter(i => i.type === 'speed_bump').length;
      const cracks = issuesAlongRoute.filter(i => i.type === 'road_crack').length;

      // Generate warnings
      const warnings = [];
      if (potholes > 0) warnings.push(`⚠️ This route has ${potholes} pothole${potholes > 1 ? 's' : ''}`);
      if (bumps > 0) warnings.push(`⚠️ This route has ${bumps} speed bump${bumps > 1 ? 's' : ''}`);
      if (cracks > 0) warnings.push(`⚠️ This route has ${cracks} road crack${cracks > 1 ? 's' : ''}`);

      // Calculate safety score (0-100)
      const totalIssues = potholes + bumps + cracks;
      const safetyScore = Math.max(0, 100 - (totalIssues * 10) - (potholes * 5));

      analyzedRoutes.push({
        index: i,
        isPrimary: i === 0,
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        issues: {
          total: totalIssues,
          potholes,
          bumps,
          cracks,
          details: issuesAlongRoute.map(iss => ({
            id: iss._id,
            type: iss.type,
            severity: iss.severity,
            location: iss.location,
            confidence: iss.confidence
          }))
        },
        warnings,
        safetyScore,
        recommendation: safetyScore >= 70 ? 'safe' : safetyScore >= 40 ? 'caution' : 'avoid'
      });
    }

    // Sort alternate routes by safety
    analyzedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
    if (analyzedRoutes.length > 0) analyzedRoutes[0].recommended = true;

    res.json({
      source,
      destination,
      routes: analyzedRoutes,
      safestRouteIndex: analyzedRoutes.length > 0 ? analyzedRoutes[0].index : 0
    });
  } catch (error) {
    console.error('Route analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze route' });
  }
});

/**
 * Find issues within a buffer distance of a route polyline
 */
async function findIssuesAlongRoute(routeCoords, bufferMeters) {
  if (!routeCoords || routeCoords.length === 0) return [];

  try {
    // Sample points along the route to create search areas
    const samplePoints = [];
    const step = Math.max(1, Math.floor(routeCoords.length / 20)); // Sample ~20 points
    
    for (let i = 0; i < routeCoords.length; i += step) {
      samplePoints.push(routeCoords[i]);
    }
    // Always include last point
    samplePoints.push(routeCoords[routeCoords.length - 1]);

    // Find issues near any sample point
    const issues = await Issue.find({
      status: { $ne: 'fake' },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: routeCoords[Math.floor(routeCoords.length / 2)]
          },
          $maxDistance: bufferMeters + calculateRouteLength(routeCoords) / 2
        }
      }
    }).limit(100);

    // Filter issues that are actually close to the route
    return issues.filter(issue => {
      const issueCoord = issue.location.coordinates;
      return isPointNearRoute(issueCoord, routeCoords, bufferMeters);
    });
  } catch (error) {
    console.warn('Error finding issues along route:', error.message);
    return [];
  }
}

/**
 * Check if a point is within buffer distance of a polyline
 */
function isPointNearRoute(point, routeCoords, bufferMeters) {
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const dist = pointToSegmentDistance(
      point[1], point[0],
      routeCoords[i][1], routeCoords[i][0],
      routeCoords[i + 1][1], routeCoords[i + 1][0]
    );
    if (dist <= bufferMeters) return true;
  }
  return false;
}

/**
 * Calculate distance from a point to a line segment (in meters)
 */
function pointToSegmentDistance(lat, lng, lat1, lng1, lat2, lng2) {
  const A = lat - lat1;
  const B = lng - lng1;
  const C = lat2 - lat1;
  const D = lng2 - lng1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dot / lenSq : -1;

  let closestLat, closestLng;
  if (param < 0) {
    closestLat = lat1;
    closestLng = lng1;
  } else if (param > 1) {
    closestLat = lat2;
    closestLng = lng2;
  } else {
    closestLat = lat1 + param * C;
    closestLng = lng1 + param * D;
  }

  return calculateDistance(lat, lng, closestLat, closestLng);
}

/**
 * Haversine formula to calculate distance between two points
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total length of a route polyline
 */
function calculateRouteLength(coords) {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += calculateDistance(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }
  return total;
}

module.exports = router;
