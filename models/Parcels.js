const mongoose = require('mongoose');

// Schema for each step in the parcel's route
const routeStepSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Created", "In Transit", "Delivered", "Suspended"],
    default: "Created"
  }
}, { _id: false });

// Main Parcel Schema
const parcelSchema = new mongoose.Schema({
  trackingNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true // faster query by trackingNumber
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  pickupLocation: {
    type: String,
    required: true
  },
  deliveredLocation: {
    type: String,
    required: true
  },
  route: {
    type: [routeStepSchema],
    required: true,
    default: [] // initialize empty array if no steps yet
  },
  currentStep: {
    type: Number,
    default: 0
  },
  currentLocation: {
    type: String,
    default: ""
  },
  suspended: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Optional: update lastUpdated whenever the document is modified
parcelSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('Parcel', parcelSchema);
