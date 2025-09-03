const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  trackingNumber: {
    type: String,
    required: true,
    uppercase: true,
    index: true, // for faster querying by trackingNumber
  },
  location: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('History', historySchema);
