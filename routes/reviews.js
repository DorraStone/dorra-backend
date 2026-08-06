const router = require('express').Router();
const Review = require('../models/Review');
const mailer = require('../utils/mailer');

// POST /api/reviews — submit a review
router.post('/', async (req, res) => {
  try {
    const review = new Review(req.body);
    await review.save();

    // Notify admin
    try { await mailer.sendReviewNotification(review); } catch(e) {}

    res.status(201).json({ success: true, id: review._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save review' });
  }
});

// GET /api/reviews/published — public: approved reviews only
router.get('/published', async (req, res) => {
  try {
    const reviews = await Review.find({ approved: true }).sort({ approvedAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /api/reviews/pending — admin only
router.get('/pending', async (req, res) => {
  try {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const reviews = await Review.find({ approved: false }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// PATCH /api/reviews/:id/approve — admin: approve
router.patch('/:id/approve', async (req, res) => {
  try {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { approved: true, approvedAt: new Date() },
      { new: true }
    );
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve review' });
  }
});

// DELETE /api/reviews/:id — admin: reject/delete
router.delete('/:id', async (req, res) => {
  try {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
