const express = require('express');
const router = express.Router();
const Partner = require('../models/Partner');
const Booking = require('../models/Booking');
const User = require('../models/User');
const bookingController = require('../controllers/bookingController');

const normalizePhone = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length > 10) return digits.slice(-10);
    return digits;
};

// @desc    Register a new partner
// @route   POST /api/partners
// @access  Public
router.post('/', async (req, res) => {
    try {
        const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
        const normalizedService = String(req.body.service || '').trim().toLowerCase();
        const normalizedPhone = normalizePhone(req.body.phone);
        const existingPartner = await Partner.findOne({
            $or: [{ email: normalizedEmail }, { phone: normalizedPhone }]
        });

        if (existingPartner) {
            return res.status(409).json({
                success: false,
                message: 'You are already registered as a partner.'
            });
        }
        const user = await User.findOne({ email: normalizedEmail });
        const partnerPayload = {
            ...req.body,
            email: normalizedEmail,
            phone: normalizedPhone,
            service: normalizedService,
            approvalStatus: 'pending',
            verifiedByAdmin: false,
            user: user ? user._id : null
        };
        const partner = await Partner.create(partnerPayload);
        if (user && user.role !== 'admin') {
            user.role = 'partner';
            await user.save();
        }
        res.status(201).json({
            success: true,
            data: partner
        });
    } catch (error) {
        console.error('Error creating partner:', error);
        if (error && error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'You are already registered as a partner.'
            });
        }
        res.status(400).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
});

// @desc    Get all partners
// @route   GET /api/partners
// @access  Public (Should be protected in production)
router.get('/', async (req, res) => {
    try {
        const partners = await Partner.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: partners.length,
            data: partners
        });
    } catch (error) {
        console.error('Error fetching partners:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @desc    Update partner status / coords
// @route   PUT /api/partners/:id/status
// @access  Public (workers call this endpoint)
router.put('/:id/status', async (req, res) => {
    try {
        const id = req.params.id;
        const { isAvailable, coords, currentBooking } = req.body || {};

        const update = {};
        if (typeof isAvailable === 'boolean') update.isAvailable = isAvailable;
        if (coords && typeof coords === 'object') update.coords = coords;
        if (currentBooking) update.currentBooking = currentBooking;

        const partner = await Partner.findByIdAndUpdate(id, update, { new: true }).lean();
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

        // If partner just became available, try to assign them to waiting bookings of their service
        if (update.isAvailable === true) {
            // find pending/searching bookings for this service (soonest first)
            const candidates = await Booking.find({ serviceName: { $regex: partner.service, $options: 'i' }, assignmentStatus: 'searching', status: { $in: ['pending'] } }).sort({ bookingDate: 1 }).limit(10);
            for (const b of candidates) {
                // try to assign this partner via bookingController helper
                const assigned = await bookingController.assignWorkerForBooking(b);
                if (assigned) {
                    await b.save();
                    break; // partner is now busy; stop
                }
            }
        }

        res.json({ success: true, data: partner });
    } catch (error) {
        console.error('Error updating partner status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
