const router  = require('express').Router();
const Order   = require('../models/Order');
const mailer  = require('../utils/mailer');

// POST /api/orders — save a new order
router.post('/', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();

    // Send confirmation email to customer
    try {
      await mailer.sendOrderConfirmation(order);
      order.emailSent = true;
      await order.save();
    } catch(emailErr) {
      console.error('Email failed:', emailErr.message);
      // Don't fail the order if email fails
    }

    // Notify Hania
    try {
      await mailer.sendAdminNotification(order);
    } catch(e) { console.error('Admin email failed:', e.message); }

    res.status(201).json({ success: true, ref: order.ref, id: order._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Order reference already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to save order' });
  }
});

// GET /api/orders — admin: get all orders
router.get('/', async (req, res) => {
  try {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// PATCH /api/orders/:ref/status — admin: update order status
router.patch('/:ref/status', async (req, res) => {
  try {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const order = await Order.findOneAndUpdate(
      { ref: req.params.ref },
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Email customer on status change
    if (['confirmed','shipped','delivered'].includes(req.body.status)) {
      try { await mailer.sendStatusUpdate(order); } catch(e) {}
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});


// GET /api/orders/returns-list — admin
router.get('/returns-list', async (req, res) => {
  try {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET)
      return res.status(401).json({ error: 'Unauthorized' });
    const Return = require('../models/Return');
    const items = await Return.find().sort({ createdAt: -1 });
    res.json(items);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/exchanges-list — admin
router.get('/exchanges-list', async (req, res) => {
  try {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET)
      return res.status(401).json({ error: 'Unauthorized' });
    const Exchange = require('../models/Exchange');
    const items = await Exchange.find().sort({ createdAt: -1 });
    res.json(items);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/orders/returns-list/:id — admin accept/deny
router.patch('/returns-list/:id', async (req, res) => {
  try {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET)
      return res.status(401).json({ error: 'Unauthorized' });
    const Return = require('../models/Return');
    const item = await Return.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ success: true, item });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/orders/exchanges-list/:id — admin accept/deny
router.patch('/exchanges-list/:id', async (req, res) => {
  try {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET)
      return res.status(401).json({ error: 'Unauthorized' });
    const Exchange = require('../models/Exchange');
    const item = await Exchange.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ success: true, item });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

// POST /api/returns — submit a return request
router.post('/returns', async (req, res) => {
  try {
    const { ref, name, address, reason } = req.body;
    const Return = require('../models/Return');
    const item = new Return({ ref, name, address, reason });
    await item.save();
    const mailer = require('../utils/mailer');
    try { await mailer.sendRequestNotification('Return', { ref, name, address, reason }); } catch(e) {}
    res.status(201).json({ success: true });
  } catch(err) {
    res.status(500).json({ error: 'Failed to submit return' });
  }
});

// POST /api/exchanges — submit an exchange request
router.post('/exchanges', async (req, res) => {
  try {
    const { ref, name, address, reason } = req.body;
    const Exchange = require('../models/Exchange');
    const item = new Exchange({ ref, name, address, reason });
    await item.save();
    const mailer = require('../utils/mailer');
    try { await mailer.sendRequestNotification('Exchange', { ref, name, address, reason }); } catch(e) {}
    res.status(201).json({ success: true });
  } catch(err) {
    res.status(500).json({ error: 'Failed to submit exchange' });
  }
});
