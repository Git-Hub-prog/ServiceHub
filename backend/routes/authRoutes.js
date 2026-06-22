const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

// one-time bootstrap route: creates admin if no admin exists
router.post('/bootstrap-admin', async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0) return res.status(409).json({ message: 'Admin already exists' });
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, password are required' });
    }
    const exists = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already exists' });
    const admin = await User.create({ name, email: String(email).trim().toLowerCase(), password, role: 'admin' });
    res.status(201).json({ success: true, data: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
