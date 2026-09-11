const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // bcrypt hash, never stored in plain text
  name:     { type: String, required: true },
  phone:    String,
  address:  String,
  city:     String,
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
