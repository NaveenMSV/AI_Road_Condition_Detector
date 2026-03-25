/**
 * Upload Page
 * Drag-and-drop image upload with AI detection results and bounding box visualization
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlineCloudUpload, HiOutlinePhotograph, HiOutlineLocationMarker,
  HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineRefresh
} from 'react-icons/hi';

const typeLabels = {
  pothole: { label: 'Pothole', emoji: '🕳️', color: 'red' },
  speed_bump: { label: 'Speed Bump', emoji: '⚠️', color: 'amber' },
  road_crack: { label: 'Road Crack', emoji: '⚡', color: 'orange' },
};

export default function UploadPage() {
  const { API } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [location, setLocation] = useState(null);
  const [description, setDescription] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  const onDrop = useCallback((files) => {
    const f = files[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const getLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingLocation(false);
        toast.success('Location captured!');
      },
      (err) => {
        toast.error('Could not get location. Please enable GPS.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select an image');

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('description', description);
      if (location) {
        formData.append('latitude', location.lat);
        formData.append('longitude', location.lng);
      }

      const { data } = await API.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      setResult(data);
      toast.success('Report submitted successfully! 🎉');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    }
    setUploading(false);
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setDescription('');
    setLocation(null);
  };

  return (
    <div className="page-container">
      <div className="content-container max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="section-title">Report Road Issue</h1>
          <p className="section-subtitle">Upload a photo of damaged road to help your community</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upload Area */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`glass-card p-8 border-2 border-dashed cursor-pointer transition-all duration-300
                ${isDragActive 
                  ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-500/10 scale-[1.02]' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50/50 dark:hover:bg-white/5'
                }`}
            >
              <input {...getInputProps()} />
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-xl"
                  />
                  {/* Bounding boxes overlay */}
                  {result?.issue?.boundingBoxes?.length > 0 && (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {result.issue.boundingBoxes.map((box, i) => {
                        const imgEl = document.querySelector('.preview-img');
                        return (
                          <g key={i}>
                            <rect
                              x={`${(box.x / 800) * 100}%`}
                              y={`${(box.y / 600) * 100}%`}
                              width={`${(box.width / 800) * 100}%`}
                              height={`${(box.height / 600) * 100}%`}
                              fill="none"
                              stroke={box.label === 'pothole' ? '#ef4444' : box.label === 'speed_bump' ? '#f59e0b' : '#f97316'}
                              strokeWidth="0.5"
                              strokeDasharray="2"
                            />
                            <text
                              x={`${(box.x / 800) * 100 + 1}%`}
                              y={`${(box.y / 600) * 100 - 1}%`}
                              fill="white"
                              fontSize="3"
                              fontWeight="bold"
                            >
                              {box.label} ({(box.confidence * 100).toFixed(0)}%)
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                  <p className="text-center text-sm text-gray-500 mt-2">Click or drag to replace image</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <HiOutlineCloudUpload className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {isDragActive ? 'Drop your image here' : 'Drag & drop road image'}
                  </p>
                  <p className="text-sm text-gray-400">or click to browse • JPEG, PNG, WebP up to 10MB</p>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HiOutlineLocationMarker className="w-5 h-5 text-primary-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</span>
                </div>
                <button
                  onClick={getLocation}
                  disabled={gettingLocation}
                  className="btn-secondary !py-2 !px-4 text-xs"
                >
                  {gettingLocation ? 'Getting...' : location ? '✅ Captured' : '📍 Get Location'}
                </button>
              </div>
              {location && (
                <p className="text-xs text-gray-400 mt-2">
                  📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="glass-card p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field resize-none"
                rows={3}
                placeholder="Describe the road condition..."
                maxLength={500}
              />
            </div>

            {/* Upload Button */}
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="spinner !w-5 !h-5 !border-2 !border-white/30 !border-t-white" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <HiOutlineCloudUpload className="w-5 h-5" />
                    Upload & Detect
                  </>
                )}
              </button>
              {(file || result) && (
                <button onClick={resetForm} className="btn-secondary flex items-center gap-2">
                  <HiOutlineRefresh className="w-5 h-5" />
                  Reset
                </button>
              )}
            </div>
          </motion.div>

          {/* Right: Detection Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {/* Detection Summary */}
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <HiOutlineCheckCircle className="w-8 h-8 text-green-500" />
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detection Complete</h3>
                        <p className="text-sm text-gray-500">AI analysis results</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Main Detection */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-500/10 dark:to-accent-500/10 border border-primary-100 dark:border-primary-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">
                              {typeLabels[result.issue?.type]?.emoji || '🔍'}
                            </span>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white text-lg">
                                {typeLabels[result.issue?.type]?.label || 'Unknown'}
                              </p>
                              <p className="text-sm text-gray-500">Detected Issue</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold gradient-text">
                              {((result.issue?.confidence || 0) * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-gray-500">Confidence</p>
                          </div>
                        </div>
                      </div>

                      {/* Severity */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Severity</span>
                        <span className={`badge-severity-${result.issue?.severity || 'medium'} capitalize`}>
                          {result.issue?.severity || 'medium'}
                        </span>
                      </div>

                      {/* All Detections */}
                      {result.detections?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            All Detections ({result.detections.length})
                          </p>
                          <div className="space-y-2">
                            {result.detections.map((det, i) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-white/5">
                                <div className="flex items-center gap-2">
                                  <span>{typeLabels[det.label]?.emoji || '🔍'}</span>
                                  <span className="text-sm font-medium capitalize">{det.label?.replace('_', ' ')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                                      style={{ width: `${(det.confidence || 0) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500 w-10 text-right">
                                    {((det.confidence || 0) * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card p-8 flex flex-col items-center justify-center h-full min-h-[400px]"
                >
                  <HiOutlinePhotograph className="w-20 h-20 text-gray-200 dark:text-gray-700 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-400 dark:text-gray-500 mb-2">
                    No Detection Yet
                  </h3>
                  <p className="text-sm text-gray-300 dark:text-gray-600 text-center max-w-xs">
                    Upload a road image to get AI-powered detection results with bounding boxes
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
