const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  upsertMyProfile,
  updateAvailability,
  getMyJobs,
  updateJobProgress
} = require('../controllers/partnerController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.use(protect, authorizeRoles('partner'));

router.get('/me', getMyProfile);
router.post('/me', upsertMyProfile);
router.put('/me/availability', updateAvailability);
router.get('/me/jobs', getMyJobs);
router.put('/me/jobs/:bookingId/progress', updateJobProgress);

module.exports = router;
