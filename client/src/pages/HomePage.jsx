/**
 * Home Page
 * Interactive map with clustered markers showing road issues
 * Includes heatmap toggle and issue type filters
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { HiOutlineFilter, HiOutlineFire, HiOutlinePlus, HiOutlineLocationMarker } from 'react-icons/hi';
import axios from 'axios';
import toast from 'react-hot-toast';

// Custom marker icons
const createIcon = (color, emoji) => {
  return L.divIcon({
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px;">${emoji}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const icons = {
  pothole: createIcon('#ef4444', '🕳️'),
  speed_bump: createIcon('#f59e0b', '⚠️'),
  road_crack: createIcon('#f97316', '⚡'),
};

const severityColors = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

// Heatmap component
function HeatmapLayer({ issues }) {
  const map = useMap();

  useEffect(() => {
    if (!issues.length) return;

    // Simple circle-based heatmap since leaflet.heat may not load
    const circles = issues.map(issue => {
      const [lng, lat] = issue.location.coordinates;
      const color = severityColors[issue.severity] || '#ef4444';
      return L.circle([lat, lng], {
        radius: 150,
        fillColor: color,
        fillOpacity: 0.3,
        stroke: false,
      });
    });

    const group = L.layerGroup(circles);
    group.addTo(map);

    return () => {
      map.removeLayer(group);
    };
  }, [map, issues]);

  return null;
}

export default function HomePage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [filter, setFilter] = useState('all');
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(5);

  const fetchIssues = useCallback(async () => {
    try {
      const { data } = await axios.get('/issues');
      setIssues(data.issues || []);
      
      // Center map on first issue if available
      if (data.issues?.length > 0) {
        const first = data.issues[0];
        const [lng, lat] = first.location.coordinates;
        if (lat && lng) {
          setMapCenter([lat, lng]);
          setMapZoom(12);
        }
      }
    } catch (err) {
      console.warn('Could not fetch issues:', err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Try to get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter([pos.coords.latitude, pos.coords.longitude]);
          setMapZoom(13);
        },
        () => {} // Ignore errors silently
      );
    }
  }, []);

  const filteredIssues = filter === 'all' 
    ? issues 
    : issues.filter(i => i.type === filter);

  const issueStats = {
    total: issues.length,
    potholes: issues.filter(i => i.type === 'pothole').length,
    bumps: issues.filter(i => i.type === 'speed_bump').length,
    cracks: issues.filter(i => i.type === 'road_crack').length,
  };

  return (
    <div className="page-container">
      <div className="content-container">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="section-title">Road Condition Map</h1>
              <p className="section-subtitle">Live view of reported road issues near you</p>
            </div>
            <Link to="/upload" className="btn-primary flex items-center gap-2 w-fit">
              <HiOutlinePlus className="w-5 h-5" />
              Report Issue
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Reports', value: issueStats.total, color: 'from-primary-500 to-primary-600', emoji: '📊' },
              { label: 'Potholes', value: issueStats.potholes, color: 'from-red-500 to-red-600', emoji: '🕳️' },
              { label: 'Speed Bumps', value: issueStats.bumps, color: 'from-amber-500 to-amber-600', emoji: '⚠️' },
              { label: 'Road Cracks', value: issueStats.cracks, color: 'from-orange-500 to-orange-600', emoji: '⚡' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-4 flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg text-lg`}>
                  {stat.emoji}
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-1 bg-white/50 dark:bg-white/5 rounded-xl p-1 border border-gray-200/50 dark:border-gray-700/50">
              <HiOutlineFilter className="w-4 h-4 ml-2 text-gray-400" />
              {['all', 'pothole', 'speed_bump', 'road_crack'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filter === f 
                      ? 'bg-primary-500 text-white shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'pothole' ? '🕳️ Potholes' : f === 'speed_bump' ? '⚠️ Bumps' : '⚡ Cracks'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                showHeatmap 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' 
                  : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/50'
              }`}
            >
              <HiOutlineFire className="w-4 h-4" />
              Heatmap
            </button>
          </div>
        </motion.div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden"
          style={{ height: '65vh', minHeight: '400px' }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="spinner mx-auto mb-4" />
                <p className="text-gray-500">Loading map data...</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              className="h-full w-full"
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {showHeatmap && <HeatmapLayer issues={filteredIssues} />}

              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={60}
                spiderfyOnMaxZoom={true}
                showCoverageOnHover={false}
              >
                {filteredIssues.map(issue => {
                  const [lng, lat] = issue.location?.coordinates || [0, 0];
                  if (!lat && !lng) return null;
                  return (
                    <Marker
                      key={issue.id}
                      position={[lat, lng]}
                      icon={icons[issue.type] || icons.pothole}
                    >
                      <Popup maxWidth={280}>
                        <div className="p-1">
                          {issue.image?.url && (
                            <img 
                              src={issue.image.url} 
                              alt={issue.type}
                              className="w-full h-32 object-cover rounded-lg mb-2"
                            />
                          )}
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`badge-${issue.type === 'speed_bump' ? 'bump' : issue.type === 'road_crack' ? 'crack' : 'pothole'}`}>
                              {issue.type === 'pothole' ? '🕳️ Pothole' : issue.type === 'speed_bump' ? '⚠️ Speed Bump' : '⚡ Road Crack'}
                            </span>
                            <span className={`badge-severity-${issue.severity}`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Confidence: {(issue.confidence * 100).toFixed(0)}% • {new Date(issue.createdAt).toLocaleDateString()}
                          </p>
                          {issue.reporter?.name && (
                            <p className="text-xs text-gray-400 mt-0.5">By {issue.reporter.name}</p>
                          )}
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                            <HiOutlineLocationMarker className="w-3 h-3" />
                            {lat.toFixed(4)}, {lng.toFixed(4)}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MarkerClusterGroup>
            </MapContainer>
          )}
        </motion.div>
      </div>
    </div>
  );
}
