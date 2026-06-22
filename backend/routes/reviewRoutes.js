const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const reviews = await Review.find().lean();
    const total = reviews.length;
    const avgRating = total ? (reviews.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / total) : 0;
    const recommendRate = total ? (reviews.filter((item) => item.recommend).length / total) * 100 : 0;
    const urgentCount = reviews.filter((item) => item.urgency === 'high').length;

    res.json({
      success: true,
      data: {
        total,
        avgRating: Number(avgRating.toFixed(1)),
        recommendRate: Number(recommendRate.toFixed(0)),
        urgentCount
      }
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = {
      reviewerName: String(req.body.reviewerName || '').trim(),
      reviewerRole: 'user',
      serviceName: String(req.body.serviceName || '').trim(),
      rating: Number(req.body.rating),
      punctuality: Number(req.body.punctuality ?? req.body.rating),
      professionalism: Number(req.body.professionalism ?? req.body.rating),
      valueForMoney: Number(req.body.valueForMoney ?? req.body.rating),
      recommend: Boolean(req.body.recommend),
      urgency: ['low', 'medium', 'high'].includes(req.body.urgency) ? req.body.urgency : 'medium',
      title: String(req.body.title || '').trim(),
      comment: String(req.body.comment || '').trim()
    };

    if (!payload.reviewerName || !payload.serviceName || !payload.comment || Number.isNaN(payload.rating)) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
    }

    const review = await Review.create(payload);
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(400).json({ success: false, message: error.message || 'Server error' });
  }
});

module.exports = router;