const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  cancelBooking,
  createPaymentOrder,
  verifyPaymentAndCreateBooking
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-order', protect, createPaymentOrder);
router.post('/verify-payment', protect, verifyPaymentAndCreateBooking);
router.post('/', protect, createBooking);
router.get('/mybookings', protect, getMyBookings);
router.delete('/:id', protect, cancelBooking);

module.exports = router;
