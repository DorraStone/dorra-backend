const mongoose = require('mongoose');
const ExchangeSchema = new mongoose.Schema({
  ref: String,
  name: String,
  address: String,
  reason: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Exchange', ExchangeSchema);
