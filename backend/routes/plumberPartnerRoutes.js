const express = require('express');
const router = express.Router();
const Partner = require('../models/Partner');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getMyProfile,
  getMyJobs,
  updateJobProgress,
  markJobComplete
} = require('../controllers/partnerController');

const requirePlumberService = async (req, res, next) => {
  try {
    const partner = await Partner.findOne({ user: req.user._id });
    if (!partner) return res.status(404).json({ message: 'Partner profile not found' });

    const service = String(partner.service || '').toLowerCase();
    if (!service.includes('plumb')) {
      return res.status(403).json({ message: 'Access denied: plumber service employees only' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

router.use(protect, authorizeRoles('partner'), requirePlumberService);

router.get('/me', getMyProfile);
router.get('/jobs', getMyJobs);
router.put('/jobs/:bookingId/progress', updateJobProgress);
router.put('/jobs/:bookingId/mark-done', markJobComplete);

module.exports = router;

