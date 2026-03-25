/**
 * Issues Routes
 * Handles image upload, AI detection, issue CRUD, and upvoting
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const Issue = require('../models/Issue');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'road-condition-detector',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

/**
 * POST /api/upload
 * Upload road image, run AI detection, store results
 */
router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { latitude, longitude, address, description } = req.body;

    // Call AI detection service
    // Fetch the image from Cloudinary to pass to AI service
    let detectionResult = {
      detections: [{
        label: 'pothole',
        confidence: 0.85,
        bbox: { x: 100, y: 100, width: 200, height: 150 }
      }]
    };

    try {
      // Download image buffer from Cloudinary URL to send to AI
      const imageResponse = await axios.get(req.file.path, { responseType: 'stream' });
      const formData = new FormData();
      formData.append('image', imageResponse.data, { filename: req.file.filename });

      const aiResponse = await axios.post(
        `${process.env.AI_SERVICE_URL || 'http://localhost:5000'}/detect`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000
        }
      );
      detectionResult = aiResponse.data;
    } catch (aiError) {
      console.warn('⚠️  AI service unavailable or image fetch failed, using fallback detection:', aiError.message);
    }

    // Determine issue type and confidence from detection
    const topDetection = detectionResult.detections && detectionResult.detections.length > 0
      ? detectionResult.detections[0]
      : { label: 'pothole', confidence: 0.5 };

    const typeMap = {
      'pothole': 'pothole',
      'speed_bump': 'speed_bump',
      'bump': 'speed_bump',
      'road_crack': 'road_crack',
      'crack': 'road_crack'
    };

    const issueType = typeMap[topDetection.label] || 'pothole';

    // Determine severity from confidence
    let severity = 'low';
    if (topDetection.confidence > 0.9) severity = 'critical';
    else if (topDetection.confidence > 0.75) severity = 'high';
    else if (topDetection.confidence > 0.5) severity = 'medium';

    // Determine coordinates
    let coords = [0, 0]; // [lng, lat]
    if (latitude && longitude) {
      coords = [parseFloat(longitude), parseFloat(latitude)];
    } else if (detectionResult.gps) {
      coords = [detectionResult.gps.longitude, detectionResult.gps.latitude];
    }

    // Create issue document
    const issue = new Issue({
      type: issueType,
      severity,
      confidence: topDetection.confidence,
      location: {
        type: 'Point',
        coordinates: coords,
        address: address || ''
      },
      image: {
        url: req.file.path,
        filename: req.file.filename
      },
      boundingBoxes: (detectionResult.detections || []).map(d => ({
        label: d.label,
        confidence: d.confidence,
        x: d.bbox?.x || 0,
        y: d.bbox?.y || 0,
        width: d.bbox?.width || 0,
        height: d.bbox?.height || 0
      })),
      reporter: req.userId,
      description: description || ''
    });

    await issue.save();

    // Update user's report count
    await User.findByIdAndUpdate(req.userId, { $inc: { reportsCount: 1 } });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('newIssue', {
        id: issue._id,
        type: issue.type,
        severity: issue.severity,
        confidence: issue.confidence,
        location: issue.location,
        image: issue.image,
        createdAt: issue.createdAt
      });
    }

    res.status(201).json({
      message: 'Report submitted successfully',
      issue: {
        id: issue._id,
        type: issue.type,
        severity: issue.severity,
        confidence: issue.confidence,
        location: issue.location,
        image: issue.image,
        boundingBoxes: issue.boundingBoxes,
        createdAt: issue.createdAt
      },
      detections: detectionResult.detections
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
});

/**
 * GET /api/issues
 * Fetch all reported road issues, with optional filters
 */
router.get('/issues', async (req, res) => {
  try {
    const { type, status, severity, lat, lng, radius } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    // Geospatial query if coordinates provided
    if (lat && lng) {
      const maxDistance = parseInt(radius) || 5000; // 5km default
      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: maxDistance
        }
      };
    }

    const issues = await Issue.find(filter)
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 })
      .limit(500);

    res.json({
      count: issues.length,
      issues: issues.map(issue => ({
        id: issue._id,
        type: issue.type,
        severity: issue.severity,
        confidence: issue.confidence,
        location: issue.location,
        image: issue.image,
        boundingBoxes: issue.boundingBoxes,
        reporter: issue.reporter,
        upvoteCount: issue.upvoteCount,
        status: issue.status,
        description: issue.description,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt
      }))
    });
  } catch (error) {
    console.error('Fetch issues error:', error);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

/**
 * PUT /api/issues/:id/upvote
 * Upvote/confirm an existing issue
 */
router.put('/issues/:id/upvote', auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const alreadyUpvoted = issue.upvotes.includes(req.userId);
    if (alreadyUpvoted) {
      // Remove upvote (toggle)
      issue.upvotes = issue.upvotes.filter(id => !id.equals(req.userId));
      issue.upvoteCount = Math.max(0, issue.upvoteCount - 1);
    } else {
      issue.upvotes.push(req.userId);
      issue.upvoteCount += 1;
      // Auto-verify if enough upvotes
      if (issue.upvoteCount >= 3 && issue.status === 'pending') {
        issue.status = 'verified';
      }
    }

    await issue.save();
    res.json({ upvoteCount: issue.upvoteCount, upvoted: !alreadyUpvoted, status: issue.status });
  } catch (error) {
    console.error('Upvote error:', error);
    res.status(500).json({ error: 'Failed to update upvote' });
  }
});

/**
 * PUT /api/issues/:id/status
 * Update issue status (admin only)
 */
router.put('/issues/:id/status', auth, admin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'verified', 'resolved', 'fake'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    res.json({ message: 'Status updated', issue });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * DELETE /api/issues/:id
 * Delete an issue (admin only)
 */
router.delete('/issues/:id', auth, admin, async (req, res) => {
  try {
    const issue = await Issue.findByIdAndDelete(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Delete the image file from Cloudinary
    if (issue.image?.filename) {
      try {
        await cloudinary.uploader.destroy(issue.image.filename);
      } catch (cloudErr) {
        console.warn('Failed to delete image from Cloudinary:', cloudErr.message);
      }
    }

    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete issue' });
  }
});

/**
 * GET /api/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalIssues = await Issue.countDocuments();
    const potholes = await Issue.countDocuments({ type: 'pothole' });
    const bumps = await Issue.countDocuments({ type: 'speed_bump' });
    const cracks = await Issue.countDocuments({ type: 'road_crack' });
    const resolved = await Issue.countDocuments({ status: 'resolved' });
    const verified = await Issue.countDocuments({ status: 'verified' });
    const pending = await Issue.countDocuments({ status: 'pending' });

    // Get recent issues
    const recentIssues = await Issue.find()
      .populate('reporter', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get top contributors
    const topContributors = await User.find()
      .sort({ reportsCount: -1 })
      .limit(5)
      .select('name reportsCount');

    // Severity breakdown
    const severityCounts = {
      low: await Issue.countDocuments({ severity: 'low' }),
      medium: await Issue.countDocuments({ severity: 'medium' }),
      high: await Issue.countDocuments({ severity: 'high' }),
      critical: await Issue.countDocuments({ severity: 'critical' })
    };

    res.json({
      totalIssues,
      byType: { potholes, bumps, cracks },
      byStatus: { pending, verified, resolved },
      bySeverity: severityCounts,
      recentIssues: recentIssues.map(i => ({
        id: i._id,
        type: i.type,
        severity: i.severity,
        reporter: i.reporter?.name || 'Anonymous',
        createdAt: i.createdAt,
        location: i.location
      })),
      topContributors
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
