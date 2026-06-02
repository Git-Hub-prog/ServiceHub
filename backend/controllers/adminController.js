const User = require('../models/User');
const Partner = require('../models/Partner');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Employee = require('../models/Employee');

const parsePaging = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

exports.getDashboard = async (req, res) => {
  try {
    const [users, partners, bookings, pendingBookings, searchingBookings] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Partner.countDocuments({}),
      Booking.countDocuments({}),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ assignmentStatus: 'searching', status: 'pending' })
    ]);

    const revenueAgg = await Booking.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$price' } } }
    ]);

    res.json({
      success: true,
      data: {
        users,
        partners,
        totalBookings: bookings,
        pendingBookings,
        searchingBookings,
        totalRevenue: revenueAgg[0]?.totalRevenue || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaging(req.query);
    const projectAdminEmail = String(process.env.PROJECT_ADMIN_EMAIL || 'admin@servicehub.com').trim().toLowerCase();
    const employeeEmails = await Employee.distinct('email');
    const employeeEmailSet = employeeEmails.map((e) => String(e || '').trim().toLowerCase());

    const filter = {
      email: { $nin: [projectAdminEmail, ...employeeEmailSet] }
    };
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    const [items, total, bookingCustomers] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
      Booking.aggregate([
        { $match: { customerName: { $exists: true, $ne: '' } } },
        {
          $group: {
            _id: { $toLower: '$customerName' },
            customerName: { $first: '$customerName' },
            customerPhone: { $first: '$customerPhone' },
            lastSeenAt: { $max: '$createdAt' }
          }
        },
        { $sort: { lastSeenAt: -1 } }
      ])
    ]);

    const byKey = new Set(
      items.map((u) => `${String(u.name || '').trim().toLowerCase()}|${String(u.email || '').trim().toLowerCase()}`)
    );

    const search = String(req.query.search || '').trim().toLowerCase();
    const synthetic = [];
    for (const c of bookingCustomers) {
      const name = String(c.customerName || '').trim();
      if (!name) continue;
      const email = '';
      const key = `${name.toLowerCase()}|${email}`;
      if (byKey.has(key)) continue;

      if (search) {
        const hay = `${name} ${String(c.customerPhone || '')}`.toLowerCase();
        if (!hay.includes(search)) continue;
      }

      synthetic.push({
        _id: `booking-customer:${name.toLowerCase()}`,
        name,
        email: '-',
        role: 'customer',
        source: 'booking'
      });
      byKey.add(key);
    }

    const merged = [...items, ...synthetic].slice(0, limit);
    res.json({ success: true, page, limit, total: merged.length, data: merged });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'partner', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const targetUser = await User.findById(req.params.id).select('-password');
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const projectAdminEmail = String(process.env.PROJECT_ADMIN_EMAIL || 'admin@servicehub.com').trim().toLowerCase();
    const isProjectAdmin = String(targetUser.email || '').trim().toLowerCase() === projectAdminEmail;

    // Project admin must always stay admin
    if (isProjectAdmin && role !== 'admin') {
      return res.status(403).json({ message: 'Project Admin role cannot be changed.' });
    }

    // Only configured project admin email can be assigned admin role
    if (role === 'admin' && !isProjectAdmin) {
      return res.status(403).json({ message: 'Only Project Admin account can have admin role.' });
    }

    targetUser.role = role;
    await targetUser.save();
    const user = await User.findById(targetUser._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listPartners = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaging(req.query);
    const filter = {};
    if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { service: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    const [items, total] = await Promise.all([
      Partner.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Partner.countDocuments(filter)
    ]);
    res.json({ success: true, page, limit, total, data: items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePartnerApproval = async (req, res) => {
  try {
    const { approvalStatus, isAvailable } = req.body;
    const update = {};
    if (approvalStatus) {
      if (!['pending', 'approved', 'rejected'].includes(approvalStatus)) {
        return res.status(400).json({ message: 'Invalid approval status' });
      }
      update.approvalStatus = approvalStatus;
      update.verifiedByAdmin = approvalStatus === 'approved';
    }
    if (typeof isAvailable === 'boolean') update.isAvailable = isAvailable;
    const partner = await Partner.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!partner) return res.status(404).json({ message: 'Partner not found' });
    res.json({ success: true, data: partner });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deletePartnerByAdmin = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ message: 'Partner not found' });

    await Partner.deleteOne({ _id: partner._id });
    res.json({ success: true, message: 'Partner deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listBookings = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaging(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.assignmentStatus) filter.assignmentStatus = req.query.assignmentStatus;
    const [items, total] = await Promise.all([
      Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email'),
      Booking.countDocuments(filter)
    ]);

    // Backfill missing completer name for historical completed bookings.
    for (const booking of items) {
      if (String(booking.status || '').toLowerCase() !== 'completed') continue;
      if (booking.completedBy && booking.completedBy.employeeName) continue;

      let employeeName = '';

      // 1) If employee user id is available, resolve from Employee/User first.
      if (booking.completedBy && booking.completedBy.employeeUserId) {
        const employeeByUserId = await Employee.findById(booking.completedBy.employeeUserId).lean();
        if (employeeByUserId && employeeByUserId.fullName) {
          employeeName = employeeByUserId.fullName;
        }
        if (!employeeName) {
          const userById = await User.findById(booking.completedBy.employeeUserId).lean();
          if (userById && userById.name) employeeName = userById.name;
        }
      }

      // 2) Resolve via assigned partner mapping.
      if (booking.agent && booking.agent.partnerId) {
        const partner = await Partner.findById(booking.agent.partnerId).lean();
        if (partner) {
          if (partner.employeeId) {
            const employee = await Employee.findOne({ employeeId: partner.employeeId }).lean();
            if (employee && employee.fullName) employeeName = employee.fullName;
          }
          if (!employeeName && partner.name) employeeName = partner.name;
        }
      }

      // 3) Last known assignment name.
      if (!employeeName && booking.agent && booking.agent.fullName) {
        employeeName = booking.agent.fullName;
      }

      if (employeeName) {
        booking.completedBy = booking.completedBy || {};
        booking.completedBy.employeeName = employeeName;
        booking.completedBy.completedAt = booking.completedBy.completedAt || booking.completedAt || booking.updatedAt || new Date();
        await booking.save();
      }
    }

    res.json({ success: true, page, limit, total, data: items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateBookingByAdmin = async (req, res) => {
  try {
    const allowedFields = ['status', 'paymentStatus', 'assignmentStatus', 'progress', 'estimatedArrivalTime'];
    const update = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const booking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createServiceCategory = async (req, res) => {
  try {
    const payload = {
      categoryId: String(req.body.categoryId || '').trim(),
      categoryTitle: String(req.body.categoryTitle || '').trim(),
      services: Array.isArray(req.body.services) ? req.body.services : []
    };
    if (!payload.categoryId || !payload.categoryTitle) {
      return res.status(400).json({ message: 'categoryId and categoryTitle are required' });
    }
    const exists = await Service.findOne({ categoryId: payload.categoryId });
    if (exists) return res.status(409).json({ message: 'categoryId already exists' });
    const created = await Service.create(payload);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateServiceCategory = async (req, res) => {
  try {
    const update = {};
    if (req.body.categoryTitle !== undefined) update.categoryTitle = req.body.categoryTitle;
    if (req.body.services !== undefined) update.services = req.body.services;
    const service = await Service.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!service) return res.status(404).json({ message: 'Service category not found' });
    res.json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.deleteBookingByAdmin = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const partnerId = booking.agent && booking.agent.partnerId ? booking.agent.partnerId : null;
    if (partnerId) {
      const partner = await Partner.findById(partnerId);
      if (partner && String(partner.currentBooking || '') === String(booking._id)) {
        partner.currentBooking = null;
        partner.isAvailable = true;
        await partner.save();
      }
    }

    await Booking.deleteOne({ _id: booking._id });
    res.json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
