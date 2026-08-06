require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Middleware ──
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','OPTIONS'] }));
app.use(express.json({ limit: '10mb' })); // 10mb for screenshot uploads

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// ── MongoDB Connection ──
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// ── Routes ──
app.use('/api/orders',  require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/payment', require('./routes/payment'));

// ── Health check ──
app.get('/', (req, res) => res.json({ status: 'Dorra API running', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Dorra server running on port ${PORT}`));
