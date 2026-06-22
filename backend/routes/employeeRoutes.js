const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const employeeAuthMiddleware = require('../middleware/employeeAuthMiddleware');

// Public Routes
router.post('/login', employeeController.login);

// Protected Routes (require authentication)
router.get('/profile', employeeAuthMiddleware, employeeController.getProfile);
router.put('/profile', employeeAuthMiddleware, employeeController.updateProfile);
router.get('/dashboard-stats', employeeAuthMiddleware, employeeController.getDashboardStats);

// Booking Routes
router.get('/bookings', employeeAuthMiddleware, employeeController.getBookings);
router.post('/bookings/:bookingId/accept', employeeAuthMiddleware, employeeController.acceptBooking);
router.post('/bookings/:bookingId/start', employeeAuthMiddleware, employeeController.startWork);
router.post('/bookings/:bookingId/complete', employeeAuthMiddleware, employeeController.completeBooking);
router.post('/bookings/:bookingId/cancel', employeeAuthMiddleware, employeeController.cancelBooking);

// Customer History
router.get('/customer/:customerId/history', employeeAuthMiddleware, employeeController.getCustomerHistory);

module.exports = router;
