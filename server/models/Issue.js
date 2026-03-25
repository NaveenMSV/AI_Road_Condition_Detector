/**
 * Issue Model
 * Represents a road condition issue (pothole, bump, crack) with GeoJSON location
 */

const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['pothole', 'speed_bump', 'road_crack'],
    required: [true, 'Issue type is required']
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Location coordinates are required']
    },
    address: {
      type: String,
      default: ''
    }
  },
  image: {
    url: { type: String, required: true },
    filename: { type: String, required: true }
  },
  boundingBoxes: [{
    label: String,
    confidence: Number,
    x: Number,
    y: Number,
    width: Number,
    height: Number
  }],
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  upvoteCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'resolved', 'fake'],
    default: 'pending'
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
issueSchema.index({ location: '2dsphere' });
issueSchema.index({ type: 1, status: 1 });
issueSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Issue', issueSchema);
