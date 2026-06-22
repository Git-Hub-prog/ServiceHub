const Employee = require('../models/Employee');
const Partner = require('../models/Partner');
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');

const getPartnerForEmployee = async (employee) => {
  if (!employee) return null;
  return Partner.findOne({
    $or: [
      { employeeId: employee.employeeId },
      { email: employee.email }
    ]
  });
};

const mapBookingStatusForEmployee = (booking) => {
  const status = String(booking.status || '').toLowerCase();
  const progress = String(booking.progress || '').toLowerCase();
  if (status === 'completed') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  if (progress === 'service_started') return 'inprogress';
  if (progress === 'arrived') return 'accepted';
  return 'pending';
};

// Generate JWT Token
const generateToken = (employeeId) => {
  return jwt.sign({ employeeId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

// Employee Login
exports.login = async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    const loginId = String(employeeId || '').trim();

    // Validation
    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide employee ID and password'
      });
    }

    // Login is allowed only by employee ID
    const employee = await Employee.findOne({ employeeId: loginId });

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Invalid employee ID or password'
      });
    }

    // First-login/entry gate: employee must exist in partner list
    const partner = await Partner.findOne({
      $or: [
        { employeeId: employee.employeeId },
        { email: employee.email }
      ]
    }).lean();

    if (!partner) {
      return res.status(403).json({
        success: false,
        message: 'You are not a partner'
      });
    }

    // Check password
    const isPasswordValid = await employee.matchPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid employee ID or password'
      });
    }

    // Check if verified
    if (!employee.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not verified yet. Please contact admin.'
      });
    }

    // Generate token
    const token = generateToken(employee._id);

    res.status(200).json({
      success: true,
      token,
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      email: employee.email,
      serviceCategory: employee.serviceCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
};

// Get Employee Profile
exports.getProfile = async (req, res) => {
  try {
    const employee = await Employee.findById(req.employee.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      employee: employee.getPublicProfile()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// Update Employee Profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, experience, location, profilePhoto } = req.body;

    const employee = await Employee.findByIdAndUpdate(
      req.employee.id,
      {
        fullName,
        phone,
        experience,
        location,
        profilePhoto,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      employee: employee.getPublicProfile()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const employee = await Employee.findById(req.employee.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const partner = await getPartnerForEmployee(employee);
    if (!partner) {
      return res.status(403).json({
        success: false,
        message: 'You are not a partner'
      });
    }

    const bookings = await Booking.find({
      'agent.partnerId': partner._id
    });

    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;

    // Calculate revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayBookings = bookings.filter(b => {
      const bookingDate = new Date(b.createdAt);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate.getTime() === today.getTime() && b.status === 'completed';
    });

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weeklyBookings = bookings.filter(b => {
      return new Date(b.createdAt) >= weekStart && b.status === 'completed';
    });

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyBookings = bookings.filter(b => {
      return new Date(b.createdAt) >= monthStart && b.status === 'completed';
    });

    res.status(200).json({
      success: true,
      stats: {
        totalJobsCompleted: employee.totalJobsCompleted,
        todayJobs: todayBookings.length,
        weeklyJobs: weeklyBookings.length,
        monthlyJobs: monthlyBookings.length,
        pendingJobs: pendingBookings,
        totalRevenue: employee.totalRevenue,
        weeklyRevenue: weeklyBookings.reduce((sum, b) => sum + (b.price || 0), 0),
        monthlyRevenue: monthlyBookings.reduce((sum, b) => sum + (b.price || 0), 0),
        avgRating: employee.rating,
        reviewCount: employee.reviewCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
};

// Get Employee Bookings
exports.getBookings = async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;

    const employee = await Employee.findById(req.employee.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const partner = await getPartnerForEmployee(employee);
    if (!partner) {
      return res.status(403).json({
        success: false,
        message: 'You are not a partner'
      });
    }

    const query = { 'agent.partnerId': partner._id };

    const rawBookings = await Booking.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Booking.countDocuments(query);

    let bookings = rawBookings.map((b) => {
      const obj = b.toObject();
      obj.status = mapBookingStatusForEmployee(obj);
      return obj;
    });

    if (status && status !== 'all') {
      bookings = bookings.filter((b) => b.status === status);
    }

    res.status(200).json({
      success: true,
      bookings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
};

// Accept Booking
exports.acceptBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const Booking = require('../models/Booking');
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const employee = await Employee.findById(req.employee.id);
    const partner = await getPartnerForEmployee(employee);

    if (!partner || String(booking.agent?.partnerId || '') !== String(partner._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this booking'
      });
    }

    booking.progress = 'arrived';
    booking.acceptedAt = Date.now();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error accepting booking',
      error: error.message
    });
  }
};

// Start Work
exports.startWork = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const Booking = require('../models/Booking');
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const employee = await Employee.findById(req.employee.id);
    const partner = await getPartnerForEmployee(employee);

    if (!partner || String(booking.agent?.partnerId || '') !== String(partner._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to start this booking'
      });
    }

    if (booking.status !== 'pending' || booking.progress !== 'arrived') {
      return res.status(400).json({
        success: false,
        message: 'Can only start work on accepted bookings'
      });
    }

    booking.progress = 'service_started';
    booking.startedAt = Date.now();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Work started',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting work',
      error: error.message
    });
  }
};

// Complete Booking - WITH PAYMENT VERIFICATION
exports.completeBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const Booking = require('../models/Booking');
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const employee = await Employee.findById(req.employee.id);
    const partner = await getPartnerForEmployee(employee);

    if (!partner || String(booking.agent?.partnerId || '') !== String(partner._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this booking'
      });
    }

    // CRITICAL: Check payment status before completion
    if (booking.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed yet. Cannot mark as completed.',
        currentPaymentStatus: booking.paymentStatus
      });
    }

    if (booking.status !== 'pending' || booking.progress !== 'service_started') {
      return res.status(400).json({
        success: false,
        message: 'Can only complete bookings that are in progress'
      });
    }

    // Update booking
    booking.status = 'completed';
    booking.progress = 'completed';
    booking.completedBy = {
      employeeName: employee.fullName || employee.employeeId || 'Employee',
      employeeUserId: String(employee._id),
      completedAt: new Date()
    };
    booking.completedAt = Date.now();
    await booking.save();

    // Update employee stats
    employee.totalJobsCompleted += 1;
    employee.totalRevenue += booking.price || 0;
    await employee.save();

    res.status(200).json({
      success: true,
      message: 'Booking completed successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error completing booking',
      error: error.message
    });
  }
};

// Cancel Booking
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const Booking = require('../models/Booking');
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledAt = Date.now();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    });
  }
};

// Get Customer History
exports.getCustomerHistory = async (req, res) => {
  try {
    const { customerId } = req.params;

    const bookings = await Booking.find({
      // This endpoint is legacy in this project; keep behavior aligned to assigned partner
      'agent.partnerId': (await getPartnerForEmployee(await Employee.findById(req.employee.id)))?._id,
      customerId: customerId,
      status: 'completed'
    }).sort({ createdAt: -1 });

    const totalCompleted = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0);

    res.status(200).json({
      success: true,
      customerHistory: {
        totalCompleted,
        totalRevenue,
        bookings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching customer history',
      error: error.message
    });
  }
};
