const router = require('express').Router();
const Order  = require('../models/Order');
const mailer = require('../utils/mailer');
const https  = require('https');

// Helper: make HTTPS request
function httpsPost(hostname, path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request({
      hostname, path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// POST /api/payment/initiate — get Paymob payment token
router.post('/initiate', async (req, res) => {
  try {
    const { orderId, amount, customer } = req.body;

    if (!process.env.PAYMOB_API_KEY || process.env.PAYMOB_API_KEY.includes('PASTE')) {
      // Paymob not configured yet — return mock for testing
      return res.json({ 
        token: 'PAYMOB_NOT_CONFIGURED_YET',
        iframeUrl: null,
        note: 'Configure PAYMOB_API_KEY in .env to enable card payments'
      });
    }

    // Step 1: Auth token
    const auth = await httpsPost('accept.paymob.com', '/api/auth/tokens', {
      api_key: process.env.PAYMOB_API_KEY
    });

    // Step 2: Register order
    const paymobOrder = await httpsPost('accept.paymob.com', '/api/ecommerce/orders', {
      auth_token: auth.token,
      delivery_needed: false,
      amount_cents: Math.round(amount * 100),
      currency: 'EGP',
      items: []
    });

    // Step 3: Payment key
    const paymentKey = await httpsPost('accept.paymob.com', '/api/acceptance/payment_keys', {
      auth_token: auth.token,
      amount_cents: Math.round(amount * 100),
      expiration: 3600,
      order_id: paymobOrder.id,
      billing_data: {
        apartment: 'NA', email: customer.email,
        floor: 'NA', first_name: customer.name.split(' ')[0],
        street: customer.address, building: 'NA',
        phone_number: customer.phone, shipping_method: 'NA',
        postal_code: 'NA', city: customer.city || 'Cairo',
        country: 'EG', last_name: customer.name.split(' ')[1] || 'NA',
        state: 'NA'
      },
      currency: 'EGP',
      integration_id: process.env.PAYMOB_INTEGRATION_ID
    });

    res.json({
      token: paymentKey.token,
      iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey.token}`
    });
  } catch (err) {
    console.error('Paymob error:', err);
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});

// POST /api/payment/callback — Paymob webhook after payment
router.post('/callback', async (req, res) => {
  try {
    const { obj } = req.body;
    if (!obj) return res.status(400).json({ error: 'No payment object' });

    const { success, order, id: transactionId } = obj;
    const ref = order?.merchant_order_id;

    if (ref && success) {
      await Order.findOneAndUpdate(
        { ref },
        { paymobTransactionId: String(transactionId), paymobSuccess: true, status: 'confirmed' }
      );
      const dbOrder = await Order.findOne({ ref });
      if (dbOrder) {
        try { await mailer.sendOrderConfirmation(dbOrder); } catch(e) {}
        try { await mailer.sendAdminNotification(dbOrder); } catch(e) {}
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Callback error:', err);
    res.status(500).json({ error: 'Callback failed' });
  }
});

module.exports = router;
