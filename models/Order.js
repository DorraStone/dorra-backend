const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name:       String,
  stone:      String,          // stones the customer chose, incl. swaps + shades
  stones:     [String],        // original design stones
  size:       String,
  wireColor:  String,          // gold / silver finish
  decoWires:  [String],        // bespoke decorative wires
  isCustom:   Boolean,
  customNote: String,          // full bespoke spec
  qty:        Number,
  price:      Number,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  ref:      { type: String, unique: true },
  status:   { type: String, default: 'pending' },
  adminStatus: String,
  customer: { name: String, phone: String, email: String, address: String, city: String, notes: String },
  items:    [itemSchema],
  packaging: mongoose.Schema.Types.Mixed,
  shipping:  Number,
  subtotal:  Number,
  total:     Number,
  promoCode: String,
  discount:  Number,
  payment:   String,
  instapayRef: String,
  instapayScreenshot: String,
  isCustom:  Boolean,
  deposit:   Number,
  balance:   Number,
  dueNow:    Number,
  dueOnDelivery: Number,
  emailSent: { type: Boolean, default: false },
  date:      String,
}, { timestamps: true, strict: false });

module.exports = mongoose.model('Order', orderSchema);
