const Booking = require('../models/Booking');
const Partner = require('../models/Partner');
const crypto = require('crypto');

const tokenize = (text) =>
  String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const overlapScore = (a, b) => {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));
  if (!sa.size || !sb.size) return 0;
  let common = 0;
  sa.forEach((w) => {
    if (sb.has(w)) common += 1;
  });
  return common;
};

const inferServiceCategory = (serviceName) => {
  const t = String(serviceName || '').toLowerCase();
  if (t.includes('plumb') || t.includes('tap') || t.includes('pipe') || t.includes('geyser')) return 'plumber';
  if (t.includes('electric') || t.includes('wiring') || t.includes('switch') || t.includes('fan')) return 'electrician';
  if (t.includes('ac') || t.includes('compressor') || t.includes('cooling')) return 'ac-repair';
  if (t.includes('facial') || t.includes('hair') || t.includes('makeup') || t.includes('salon')) return 'salon';
  if (t.includes('car') || t.includes('wash') || t.includes('detailing') || t.includes('vacuum')) return 'car-cleaner';
  if (t.includes('tutor') || t.includes('coaching') || t.includes('math') || t.includes('science')) return 'home-tutor';
  return '';
};

const getPartnerActiveLoadMap = async () => {
  const rows = await Booking.aggregate([
    { $match: { 'agent.partnerId': { $ne: null }, status: { $in: ['pending'] } } },
    { $group: { _id: '$agent.partnerId', load: { $sum: 1 } } }
  ]);
  const map = new Map();
  rows.forEach((r) => map.set(String(r._id), r.load));
  return map;
};

const haversineKm = (lat1, lon1, lat2, lon2) => {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null)) return null;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const assignWorkerForBooking = async (bookingDoc) => {
  const targetService = inferServiceCategory(bookingDoc.serviceName);
  if (!targetService) return false;

  // Find partners for the service who are not explicitly unavailable.
  // Use case-insensitive match to tolerate stored variations.
  const partners = await Partner.find({ service: { $regex: `^${targetService}$`, $options: 'i' }, isAvailable: { $ne: false } }).lean();
  if (!partners.length) return false;

  const loadMap = await getPartnerActiveLoadMap();
  const TIME_WINDOW_HOURS = 3; // treat overlapping bookings within +-3 hours as conflict
  const bookingDate = bookingDoc.bookingDate ? new Date(bookingDoc.bookingDate) : null;

  const candidates = [];
  for (const p of partners) {
    const tokenProx = overlapScore(bookingDoc.address, p.address);
    let distanceKm = null;
    if (p.coords && p.coords.lat != null && p.coords.lng != null && bookingDoc.coords && bookingDoc.coords.lat != null && bookingDoc.coords.lng != null) {
      distanceKm = haversineKm(bookingDoc.coords.lat, bookingDoc.coords.lng, p.coords.lat, p.coords.lng);
    }
    const load = loadMap.get(String(p._id)) || 0;
    let busyConflict = false;
    if (bookingDate) {
      const startWindow = new Date(bookingDate.getTime() - TIME_WINDOW_HOURS * 3600 * 1000);
      const endWindow = new Date(bookingDate.getTime() + TIME_WINDOW_HOURS * 3600 * 1000);
      const conflict = await Booking.findOne({
        'agent.partnerId': p._id,
        status: { $in: ['pending'] },
        bookingDate: { $gte: startWindow, $lte: endWindow }
      }).lean();
      if (conflict) busyConflict = true;
    }
    const assignCount = Number(p.assignmentCount || 0);
    let score = tokenProx * 10 - load * 4 - assignCount * 2;
    if (distanceKm != null) {
      score += Math.max(0, 40 - distanceKm);
    }
    if (busyConflict) score -= 1000;
    const proximitySignal = distanceKm != null ? Math.max(0, 40 - distanceKm) : tokenProx;
    candidates.push({ partner: p, tokenProx, distanceKm, load, busyConflict, assignCount, score, proximitySignal });
  }

  candidates.sort((a, b) => b.score - a.score);
  let best = candidates[0] ? candidates[0].partner : null;
  let bestProximitySignal = candidates[0] ? candidates[0].proximitySignal : -Infinity;
  let bestScore = candidates[0] ? candidates[0].score : -Infinity;

  // If proximity signal is too weak, do not auto-assign
  const MIN_PROXIMITY_SIGNAL = 1;
  if (!best || bestProximitySignal < MIN_PROXIMITY_SIGNAL) {
    // No meaningful proximity signal: fallback to round-robin among available partners without time conflicts.
    const freeCandidates = candidates.filter((c) => !c.busyConflict);
    let chosen = null;
    if (freeCandidates.length) {
      // pick the one with smallest assignmentCount, then by highest score
      freeCandidates.sort((a, b) => a.assignCount - b.assignCount || b.score - a.score);
      chosen = freeCandidates[0];
    } else if (candidates.length) {
      // nobody is free in time window; pick partner with smallest assignmentCount (best attempt)
      candidates.sort((a, b) => a.assignCount - b.assignCount || b.score - a.score);
      chosen = candidates[0];
    }

    if (!chosen) {
      // debug: log candidate summary to help diagnose why matching failed
      try {
        console.debug('assignWorkerForBooking: no suitable partner. targetService=%s bookingId=%s partners=%d bestProximitySignal=%s', targetService, String(bookingDoc._id || ''), partners.length, String(bestProximitySignal));
        for (const c of candidates) {
          console.debug(' candidate %s tokenProx=%d load=%d assignmentCount=%d coords=%j busyConflict=%s score=%d addr=%s', String(c.partner._id), c.tokenProx, c.load, c.assignCount, c.partner.coords || null, c.busyConflict, c.score, c.partner.address);
        }
      } catch (e) {
        /* ignore logging errors */
      }
      return false;
    }

    best = chosen.partner;
    // proceed to assign chosen fallback
  }

  // Persist assignment back to partner (mark busy and increment counters)
  try {
    await Partner.findByIdAndUpdate(best._id, {
      $inc: { assignmentCount: 1 },
      $set: { currentBooking: bookingDoc._id, lastAssignedAt: new Date(), isAvailable: false }
    });
  } catch (e) {
    // log but continue
    console.error('Failed to update partner on assignment', e);
  }

  bookingDoc.agent = {
    partnerId: best._id,
    fullName: best.name,
    contactNumber: best.phone,
    serviceType: bookingDoc.serviceName
  };
  bookingDoc.assignmentStatus = 'assigned';
  bookingDoc.progress = 'on_the_way';
  bookingDoc.assignmentAt = new Date();
  bookingDoc.estimatedArrivalTime = new Date(Date.now() + (35 + Math.floor(Math.random() * 20)) * 60 * 1000);
  return true;
};

// Cancel booking with rules:
// - If no partner assigned (assignmentStatus === 'searching'), user can cancel anytime
// - If partner assigned, user can cancel within CANCEL_WINDOW_MINUTES after assignment
exports.cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // ensure the requester is the owner
    if (String(booking.user) !== String(req.user._id)) return res.status(403).json({ message: 'Not authorized' });

    if (booking.status !== 'pending') return res.status(400).json({ message: 'Booking cannot be cancelled' });

    if (booking.assignmentStatus === 'searching' || !booking.agent || !booking.agent.partnerId) {
      // safe to delete immediately when no worker is assigned
      await Booking.deleteOne({ _id: booking._id });
      return res.json({ success: true, deleted: true, message: 'Booking removed from history' });
    }

    // assigned case: enforce window
    const CANCEL_WINDOW_MINUTES = 15;
    const assignedAt = booking.assignmentAt || booking.updatedAt || booking.createdAt;
    const diffMs = Date.now() - new Date(assignedAt).getTime();
    const diffMin = diffMs / 60000;
    if (diffMin > CANCEL_WINDOW_MINUTES) {
      return res.status(403).json({ message: `Cancellation period (${CANCEL_WINDOW_MINUTES} minutes) has passed` });
    }

    // within window: cancel and free partner if matches
    const partnerId = booking.agent.partnerId;
    booking.status = 'cancelled';
    booking.progress = 'completed';
    booking.assignmentStatus = 'searching';
    await booking.save();

    try {
      const Partner = require('../models/Partner');
      const p = await Partner.findById(partnerId);
      if (p && String(p.currentBooking) === String(booking._id)) {
        p.currentBooking = null;
        p.isAvailable = true;
        await p.save();
      }
    } catch (e) {
      console.error('Failed to update partner on cancel:', e);
    }

    return res.json({ success: true, message: 'Booking cancelled' });
  } catch (error) {
    console.error('cancelBooking error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// expose helper for external triggers (e.g., partner status updates)
exports.assignWorkerForBooking = assignWorkerForBooking;

const createBookingRecord = async (userId, payload) => {
  const booking = new Booking({
    user: userId,
    serviceName: payload.serviceName,
    price: payload.price,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    address: payload.address,
    bookingDate: payload.bookingDate,
    paymentStatus: 'paid',
    assignmentStatus: 'searching',
    progress: 'searching',
    agent: {
      partnerId: null,
      fullName: '',
      contactNumber: '',
      serviceType: payload.serviceName
    }
  });

  const assigned = await assignWorkerForBooking(booking);
  if (!assigned) {
    booking.assignmentStatus = 'searching';
    booking.progress = 'searching';
    booking.estimatedArrivalTime = null;
  }

  return booking.save();
};

// @desc    Create Razorpay order for booking payment (test/live based on keys)
// @route   POST /api/bookings/create-order
// @access  Private
exports.createPaymentOrder = async (req, res) => {
  const { amount } = req.body;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return res.status(500).json({ message: 'Razorpay keys are missing in backend .env' });
  }
  if (
    keyId.includes('your_key_id') ||
    keySecret.includes('your_test_key_secret') ||
    keySecret.includes('your_key_secret')
  ) {
    return res.status(500).json({ message: 'Razorpay test keys are placeholders. Add valid keys in backend .env' });
  }

  const amountNum = Number(amount);
  if (!amountNum || amountNum <= 0) {
    return res.status(400).json({ message: 'Invalid payment amount' });
  }

  try {
    const receipt = `rcpt_${Date.now()}`;
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(amountNum * 100),
        currency: 'INR',
        receipt,
        payment_capture: 1
      })
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      return res.status(500).json({ message: orderData.error?.description || 'Failed to create Razorpay order' });
    }

    return res.json({
      key: keyId,
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not create payment order' });
  }
};

// @desc    Verify Razorpay payment and create booking
// @route   POST /api/bookings/verify-payment
// @access  Private
exports.verifyPaymentAndCreateBooking = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    bookingData
  } = req.body;

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({ message: 'Razorpay key secret missing in backend .env' });
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Missing payment verification details' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ message: 'Payment signature mismatch. Verification failed.' });
  }

  try {
    const createdBooking = await createBookingRecord(req.user._id, bookingData || {});
    return res.status(201).json({
      success: true,
      message: 'Payment verified and booking created',
      booking: createdBooking
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Booking creation failed after payment' });
  }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  const { serviceName, price, customerName, customerPhone, address, bookingDate } = req.body;

  try {
    const createdBooking = await createBookingRecord(req.user._id, {
      serviceName,
      price,
      customerName,
      customerPhone,
      address,
      bookingDate
    });
    res.status(201).json(createdBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user bookings
// @route   GET /api/bookings/mybookings
// @access  Private
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).sort({ createdAt: -1 });

    for (const booking of bookings) {
      if (booking.assignmentStatus === 'searching') {
        const assigned = await assignWorkerForBooking(booking);
        if (assigned) {
          await booking.save();
        }
      }
    }

    const refreshed = await Booking.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(refreshed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
