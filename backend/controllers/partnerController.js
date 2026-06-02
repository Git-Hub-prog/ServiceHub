const Partner = require('../models/Partner');
const Booking = require('../models/Booking');

const requirePartnerRole = (req, res) => {
  if (req.user.role !== 'partner') {
    res.status(403).json({ message: 'Only partner role can access this endpoint' });
    return false;
  }
  return true;
};

const getMyPartnerProfile = async (userId) => {
  return Partner.findOne({ user: userId });
};

exports.getMyProfile = async (req, res) => {
  try {
    if (!requirePartnerRole(req, res)) return;
    const partner = await getMyPartnerProfile(req.user._id);
    if (!partner) return res.status(404).json({ message: 'Partner profile not found' });
    res.json({ success: true, data: partner });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.upsertMyProfile = async (req, res) => {
  try {
    if (!requirePartnerRole(req, res)) return;
    const payload = {
      user: req.user._id,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      service: String(req.body.service || '').trim().toLowerCase(),
      experience: Number(req.body.experience),
      address: req.body.address
    };
    const existing = await getMyPartnerProfile(req.user._id);
    let profile;
    if (existing) {
      Object.assign(existing, payload);
      profile = await existing.save();
    } else {
      profile = await Partner.create(payload);
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    if (!requirePartnerRole(req, res)) return;
    const partner = await getMyPartnerProfile(req.user._id);
    if (!partner) return res.status(404).json({ message: 'Partner profile not found' });
    if (typeof req.body.isAvailable === 'boolean') partner.isAvailable = req.body.isAvailable;
    if (req.body.coords && typeof req.body.coords === 'object') partner.coords = req.body.coords;
    await partner.save();
    res.json({ success: true, data: partner });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyJobs = async (req, res) => {
  try {
    if (!requirePartnerRole(req, res)) return;
    const partner = await getMyPartnerProfile(req.user._id);
    if (!partner) return res.status(404).json({ message: 'Partner profile not found' });
    const filter = { 'agent.partnerId': partner._id };
    if (req.query.status) filter.status = req.query.status;
    const jobs = await Booking.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateJobProgress = async (req, res) => {
  try {
    if (!requirePartnerRole(req, res)) return;
    const partner = await getMyPartnerProfile(req.user._id);
    if (!partner) return res.status(404).json({ message: 'Partner profile not found' });

    const booking = await Booking.findOne({ _id: req.params.bookingId, 'agent.partnerId': partner._id });
    if (!booking) return res.status(404).json({ message: 'Assigned booking not found' });

    const allowedProgress = ['on_the_way', 'arrived', 'service_started'];
    const nextProgress = req.body.progress;
    
    // DO NOT allow marking as completed via progress endpoint
    if (!allowedProgress.includes(nextProgress)) {
      return res.status(400).json({ message: 'Invalid progress value. Use Mark Done button to complete service.' });
    }

    // ONLY update progress, DO NOT mark status as completed
    booking.progress = nextProgress;
    await booking.save();
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markJobComplete = async (req, res) => {
  try {
    if (!requirePartnerRole(req, res)) return;
    
    // ==================================================
    // STEP 1: Get partner profile
    // ==================================================
    const partner = await getMyPartnerProfile(req.user._id);
    if (!partner) {
      return res.status(404).json({ 
        message: 'Partner profile not found'
      });
    }

    // ==================================================
    // STEP 2: Find booking
    // ==================================================
    const booking = await Booking.findOne({ _id: req.params.bookingId });
    if (!booking) {
      return res.status(404).json({ 
        message: 'Booking not found'
      });
    }

    // ==================================================
    // STEP 2 → EMPLOYEE VERIFICATION
    // ==================================================
    // Verify the logged-in employee is assigned to this booking
    // Compare: booking.agent.partnerId === employee.partnerId
    
    const bookingPartnerId = String(booking.agent.partnerId || '');
    const currentPartnerId = String(partner._id);
    
    if (bookingPartnerId !== currentPartnerId) {
      return res.status(403).json({ 
        message: 'This booking is not assigned to you.',
        success: false
      });
    }

    // ==================================================
    // STEP 3 → PAYMENT VERIFICATION
    // ==================================================
    // Check payment status BEFORE marking complete
    // Condition: booking.paymentStatus === \"paid\"
    
    if (booking.paymentStatus !== 'paid') {
      return res.status(402).json({ 
        message: 'Payment not completed. You cannot mark this booking as done.',
        success: false,
        currentPaymentStatus: booking.paymentStatus
      });
    }

    // ==================================================
    // STEP 4 → COMPLETE BOOKING
    // ==================================================
    // All verifications passed - proceed with completion
    
    const User = require('../models/User');
    const employeeUser = await User.findById(req.user._id);
    if (!employeeUser) {
      return res.status(404).json({ 
        message: 'Employee user not found'
      });
    }

    // Update booking status to completed
    booking.status = 'completed';
    booking.progress = 'completed';
    booking.completedBy = {
      employeeName: employeeUser.name,
      employeeUserId: String(req.user._id),
      completedAt: new Date()
    };
    
    // Update employee availability
    partner.isAvailable = true;
    partner.currentBooking = null;
    partner.totalJobs = Number(partner.totalJobs || 0) + 1;
    await partner.save();
    await booking.save();

    // ==================================================
    // SUCCESS: Booking completed
    // ==================================================
    res.json({ 
      success: true, 
      message: 'Booking marked as completed',
      data: booking 
    });
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      success: false
    });
  }
};
