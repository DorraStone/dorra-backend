const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  piece:    String,
  text:     { type: String, required: true },
  img:      String,
  approved: { type: Boolean, default: false },
  approvedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
