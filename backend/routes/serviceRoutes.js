const express = require('express');
const router = express.Router();
const {
  getServices,
  getServicesByCategory,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory
} = require('../controllers/serviceController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', getServices);
router.get('/:categoryId', getServicesByCategory);
router.post('/', protect, authorizeRoles('admin'), createServiceCategory);
router.put('/:id', protect, authorizeRoles('admin'), updateServiceCategory);
router.delete('/:id', protect, authorizeRoles('admin'), deleteServiceCategory);

module.exports = router;
