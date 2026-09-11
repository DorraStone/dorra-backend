const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const Customer = require('../models/Customer');
const Order    = require('../models/Order');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = '180d'; // stay logged in for ~6 months

function signToken(customer) {
  return jwt.sign({ id: customer._id, email: customer.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function publicCustomer(c) {
  return { id: c._id, email: c.email, name: c.name, phone: c.phone || '', address: c.address || '', city: c.city || '' };
}

// Middleware: require a valid logged-in customer, attaches req.customer
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    req.customerAuth = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

// POST /api/customers/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, phone, address, city } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = await Customer.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists - please log in instead' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const customer = await Customer.create({
      email: email.toLowerCase().trim(), password: hashed, name, phone, address, city
    });
    const token = signToken(customer);
    res.status(201).json({ success: true, token, customer: publicCustomer(customer) });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/customers/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const customer = await Customer.findOne({ email: email.toLowerCase().trim() });
    if (!customer) return res.status(401).json({ error: 'Incorrect email or password' });
    const match = await bcrypt.compare(password, customer.password);
    if (!match) return res.status(401).json({ error: 'Incorrect email or password' });
    const token = signToken(customer);
    res.json({ success: true, token, customer: publicCustomer(customer) });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// GET /api/customers/me — verify a stored token is still valid, return fresh profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customerAuth.id);
    if (!customer) return res.status(404).json({ error: 'Account not found' });
    res.json({ success: true, customer: publicCustomer(customer) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load account' });
  }
});

// GET /api/customers/my-orders — order history for the logged-in customer.
// Matched by email (not a stored order-owner ID), so this also picks up any past
// orders placed as a guest with this same email before the account existed.
router.get('/my-orders', requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ 'customer.email': req.customerAuth.email }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load order history' });
  }
});

// GET /api/customers/insights — admin only: per-customer purchase analytics computed
// live from real order history (total orders, total spent, favorite stone & type).
router.get('/insights', async (req, res) => {
  try {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const orders = await Order.find();
    const byEmail = {};
    orders.forEach(o => {
      const email = o.customer && o.customer.email;
      if (!email) return;
      if (!byEmail[email]) {
        byEmail[email] = { email, name: o.customer.name, orders: 0, totalSpent: 0, stoneCounts: {}, typeCounts: {} };
      }
      const c = byEmail[email];
      c.orders += 1;
      c.totalSpent += o.total || 0;
      (o.items || []).forEach(i => {
        (i.stones || []).forEach(s => { c.stoneCounts[s] = (c.stoneCounts[s] || 0) + 1; });
      });
    });
    const topOf = obj => {
      const entries = Object.entries(obj);
      if (!entries.length) return null;
      return entries.sort((a, b) => b[1] - a[1])[0][0];
    };
    const result = Object.values(byEmail).map(c => ({
      email: c.email, name: c.name, orders: c.orders, totalSpent: c.totalSpent,
      favoriteStone: topOf(c.stoneCounts)
    })).sort((a, b) => b.totalSpent - a.totalSpent);
    res.json(result);
  } catch (err) {
    console.error('Insights error:', err.message);
    res.status(500).json({ error: 'Failed to compute insights' });
  }
});

module.exports = router;
