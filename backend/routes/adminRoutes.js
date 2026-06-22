const express = require('express');
const router = express.Router();
const {
  getDashboard,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserDetails,
  updateUserRole,
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeDetails,
  listPartners,
  updatePartnerApproval,
  deletePartnerByAdmin,
  listBookings,
  updateBookingByAdmin,
  deleteBookingByAdmin,
  getEmployeeStatus,
  getReports,
  createServiceCategory,
  updateServiceCategory
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Secure all admin routes
router.use(protect, authorizeRoles('admin'));

// Dashboard Stats
router.get('/dashboard', getDashboard);

// User Management CRUD
router.get('/users', listUsers);
router.post('/users', createUser);
router.get('/users/:id/details', getUserDetails);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/role', updateUserRole); // Legacy compatibility

// Employee Management CRUD
router.get('/employees', listEmployees);
router.post('/employees', createEmployee);
router.get('/employees/:id', getEmployeeDetails);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);

// Partner Applications
router.get('/partners', listPartners);
router.put('/partners/:id/approval', updatePartnerApproval);
router.delete('/partners/:id', deletePartnerByAdmin);

// Bookings Overrides
router.get('/bookings', listBookings);
router.put('/bookings/:id', updateBookingByAdmin);
router.delete('/bookings/:id', deleteBookingByAdmin);

// Employee Live Status Monitoring
router.get('/employees/status', getEmployeeStatus);

// Reports & Analytics
router.get('/reports', getReports);

// Services (Categories)
router.post('/services', createServiceCategory);
router.put('/services/:id', updateServiceCategory);

module.exports = router;
