const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  trackingNumber: {
    type: String,
    required: true,
    uppercase: true,
    index: true, // for faster querying
  },
  location: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["Created", "In Transit", "Delivered", "Suspended"], // restrict status
    default: "Created"
  },
  stepNumber: {
    type: Number,
    default: 0, // step in the route (0 = pickup)
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('History', historySchema);
