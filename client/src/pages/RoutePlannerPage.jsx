/**
 * Route Planner Page
 * Enter source/destination, view route with road issue warnings
 */

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  HiOutlineLocationMarker, HiOutlineArrowRight, HiOutlineExclamation,
  HiOutlineShieldCheck, HiOutlineShieldExclamation, HiOutlineSwitchHorizontal
} from 'react-icons/hi';

const startIcon = L.divIcon({
  html: '<div style="background:#22c55e;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px;">🅰️</div>',
  className: '', iconSize: [28, 28], iconAnchor: [14, 28],
});

const endIcon = L.divIcon({
  html: '<div style="background:#ef4444;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px;">🅱️</div>',
  className: '', iconSize: [28, 28], iconAnchor: [14, 28],
});

const issueIcon = L.divIcon({
  html: '<div style="background:#f59e0b;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);font-size:10px;">⚠️</div>',
  className: '', iconSize: [20, 20], iconAnchor: [10, 20],
});

// Auto-fit map bounds to route
function FitBounds({ bounds }) {
  const map = useMap();
  if (bounds) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
  return null;
}

// Geocode place name to coordinates
async function geocode(query) {
  try {
    const { data } = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
    );
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name };
    }
    return null;
  } catch {
    return null;
  }
}

export default function RoutePlannerPage() {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [bounds, setBounds] = useState(null);

  const analyzeRoute = async () => {
    if (!source.trim() || !destination.trim()) {
      return toast.error('Please enter both source and destination');
    }

    setLoading(true);
    try {
      // Geocode locations
      const [srcGeo, dstGeo] = await Promise.all([geocode(source), geocode(destination)]);

      if (!srcGeo) return toast.error(`Could not find: ${source}`);
      if (!dstGeo) return toast.error(`Could not find: ${destination}`);

      // Get route analysis
      const { data } = await axios.post('/route-analysis', {
        source: { lat: srcGeo.lat, lng: srcGeo.lng },
        destination: { lat: dstGeo.lat, lng: dstGeo.lng },
      });

      setRouteData({ ...data, srcGeo, dstGeo });
      setSelectedRoute(0);
      setBounds(L.latLngBounds([srcGeo.lat, srcGeo.lng], [dstGeo.lat, dstGeo.lng]));
    } catch (err) {
      toast.error('Route analysis failed. Please try again.');
    }
    setLoading(false);
  };

  const swapLocations = () => {
    setSource(destination);
    setDestination(source);
  };

  const route = routeData?.routes?.[selectedRoute];
  const routePositions = route?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [];

  const routeColor = route?.recommendation === 'safe' ? '#22c55e' 
    : route?.recommendation === 'caution' ? '#eab308' : '#ef4444';

  return (
    <div className="page-container">
      <div className="content-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="section-title mb-1">Smart Route Planner</h1>
          <p className="section-subtitle mb-6">Plan your journey and avoid road hazards</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Inputs + Results */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-4"
          >
            {/* Route Input */}
            <div className="glass-card p-5 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    📍 From
                  </label>
                  <input
                    id="source-input"
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="input-field"
                    placeholder="e.g., Mumbai, India"
                  />
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={swapLocations}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    title="Swap locations"
                  >
                    <HiOutlineSwitchHorizontal className="w-5 h-5 text-gray-400 rotate-90" />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    🏁 To
                  </label>
                  <input
                    id="destination-input"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="input-field"
                    placeholder="e.g., Pune, India"
                  />
                </div>
              </div>

              <button
                onClick={analyzeRoute}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="spinner !w-5 !h-5 !border-2 !border-white/30 !border-t-white" />
                    Analyzing Route...
                  </>
                ) : (
                  <>
                    <HiOutlineLocationMarker className="w-5 h-5" />
                    Analyze Route
                  </>
                )}
              </button>
            </div>

            {/* Route Results */}
            <AnimatePresence>
              {routeData && route && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Safety Score */}
                  <div className={`glass-card p-5 border-l-4 ${
                    route.recommendation === 'safe' ? 'border-green-500' :
                    route.recommendation === 'caution' ? 'border-yellow-500' : 'border-red-500'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {route.recommendation === 'safe' ? (
                          <HiOutlineShieldCheck className="w-6 h-6 text-green-500" />
                        ) : (
                          <HiOutlineShieldExclamation className="w-6 h-6 text-yellow-500" />
                        )}
                        <span className="font-bold text-gray-900 dark:text-white">Safety Score</span>
                      </div>
                      <span className={`text-3xl font-bold ${
                        route.safetyScore >= 70 ? 'text-green-500' :
                        route.safetyScore >= 40 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {route.safetyScore}/100
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${route.safetyScore}%`,
                          background: route.safetyScore >= 70 ? '#22c55e' :
                            route.safetyScore >= 40 ? '#eab308' : '#ef4444'
                        }}
                      />
                    </div>
                  </div>

                  {/* Issue Counts */}
                  <div className="glass-card p-5">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">Issues on Route</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Potholes', count: route.issues?.potholes || 0, emoji: '🕳️', color: 'red' },
                        { label: 'Bumps', count: route.issues?.bumps || 0, emoji: '⚠️', color: 'amber' },
                        { label: 'Cracks', count: route.issues?.cracks || 0, emoji: '⚡', color: 'orange' },
                      ].map(item => (
                        <div key={item.label} className="text-center p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                          <span className="text-2xl">{item.emoji}</span>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{item.count}</p>
                          <p className="text-xs text-gray-500">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Warnings */}
                  {route.warnings?.length > 0 && (
                    <div className="glass-card p-5">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <HiOutlineExclamation className="w-5 h-5 text-yellow-500" />
                        Warnings
                      </h3>
                      <div className="space-y-2">
                        {route.warnings.map((w, i) => (
                          <div key={i} className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-sm text-yellow-800 dark:text-yellow-300">
                            {w}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Route Distance/Duration */}
                  <div className="glass-card p-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Distance</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {route.distance ? `${(route.distance / 1000).toFixed(1)} km` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-500">Est. Duration</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {route.duration ? `${Math.ceil(route.duration / 60)} min` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Alternate Routes */}
                  {routeData.routes?.length > 1 && (
                    <div className="glass-card p-5">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-3">Routes</h3>
                      <div className="space-y-2">
                        {routeData.routes.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedRoute(i)}
                            className={`w-full p-3 rounded-xl text-left transition-all ${
                              selectedRoute === i
                                ? 'bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30'
                                : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Route {i + 1} {r.recommended ? '⭐' : ''}
                              </span>
                              <span className={`text-sm font-bold ${
                                r.safetyScore >= 70 ? 'text-green-500' :
                                r.safetyScore >= 40 ? 'text-yellow-500' : 'text-red-500'
                              }`}>
                                {r.safetyScore}/100
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {r.issues?.total || 0} issues • {r.distance ? `${(r.distance / 1000).toFixed(1)} km` : ''}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right: Map */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 glass-card overflow-hidden"
            style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}
          >
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {bounds && <FitBounds bounds={bounds} />}

              {/* Route Line */}
              {routePositions.length > 0 && (
                <Polyline
                  positions={routePositions}
                  color={routeColor}
                  weight={5}
                  opacity={0.8}
                  dashArray={route?.recommendation === 'avoid' ? '10' : undefined}
                />
              )}

              {/* Source Marker */}
              {routeData?.srcGeo && (
                <Marker position={[routeData.srcGeo.lat, routeData.srcGeo.lng]} icon={startIcon}>
                  <Popup><b>Start:</b> {source}</Popup>
                </Marker>
              )}

              {/* Destination Marker */}
              {routeData?.dstGeo && (
                <Marker position={[routeData.dstGeo.lat, routeData.dstGeo.lng]} icon={endIcon}>
                  <Popup><b>End:</b> {destination}</Popup>
                </Marker>
              )}

              {/* Issue Markers along route */}
              {route?.issues?.details?.map((issue, i) => {
                const [lng, lat] = issue.location?.coordinates || [0, 0];
                if (!lat && !lng) return null;
                return (
                  <Marker key={i} position={[lat, lng]} icon={issueIcon}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold capitalize">{issue.type?.replace('_', ' ')}</p>
                        <p className="text-gray-500">Severity: {issue.severity}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
