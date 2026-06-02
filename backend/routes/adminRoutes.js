const express = require('express');
const router = express.Router();
const {
  getDashboard,
  listUsers,
  updateUserRole,
  listPartners,
  updatePartnerApproval,
  deletePartnerByAdmin,
  listBookings,
  updateBookingByAdmin,
  deleteBookingByAdmin,
  createServiceCategory,
  updateServiceCategory
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.use(protect, authorizeRoles('admin'));

router.get('/dashboard', getDashboard);
router.get('/users', listUsers);
router.put('/users/:id/role', updateUserRole);

router.get('/partners', listPartners);
router.put('/partners/:id/approval', updatePartnerApproval);
router.delete('/partners/:id', deletePartnerByAdmin);

router.get('/bookings', listBookings);
router.put('/bookings/:id', updateBookingByAdmin);
router.delete('/bookings/:id', deleteBookingByAdmin);

router.post('/services', createServiceCategory);
router.put('/services/:id', updateServiceCategory);

module.exports = router;

