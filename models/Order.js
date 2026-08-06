const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  stone:   String,
  size:    String,
  qty:     { type: Number, default: 1 },
  price:   Number,
});

const orderSchema = new mongoose.Schema({
  ref:       { type: String, required: true, unique: true },
  status:    { type: String, default: 'pending', enum: ['pending','confirmed','crafting','shipped','delivered','cancelled'] },
  adminStatus: { type: String, default: 'new' },

  customer: {
    name:    { type: String, required: true },
    phone:   { type: String, required: true },
    email:   { type: String, required: true },
    address: { type: String, required: true },
    city:    String,
    notes:   String,
  },

  items:    [itemSchema],
  packaging: { type: String, default: 'standard' },
  shipping:  Number,
  subtotal:  Number,
  total:     { type: Number, required: true },

  payment:   String,
  instapayRef:        String,
  instapayScreenshot: String,
  paymobTransactionId: String,
  paymobSuccess:       { type: Boolean, default: false },

  isCustom:   { type: Boolean, default: false },
  deposit:    Number,
  balance:    Number,
  dueNow:     Number,
  dueOnDelivery: Number,

  emailSent:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
