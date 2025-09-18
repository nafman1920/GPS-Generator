const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  trackingNumber: {
    type: String,
    required: true,
    uppercase: true,
    index: true,
  },
  location: {
    type: String,
    required: false, // optional for suspend/resume events
  },
  status: {
    type: String,
    required: true,
    enum: [
      "Parcel received at origin facility",
      "Parcel in transit",
      "Parcel in customs custody",
      "Parcel delivered",
      "Parcel suspended",
      "Parcel resumed"
    ],
  },
  isSuspended: {
    type: Boolean,
    default: false,
  },
  stepNumber: {
    type: Number,
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('History', historySchema);
