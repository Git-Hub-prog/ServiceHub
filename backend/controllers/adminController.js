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

// @desc    Get Dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
exports.getDashboard = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const [users, employees, bookings, activeJobs] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Employee.countDocuments({}),
      Booking.countDocuments({}),
      Booking.countDocuments({ status: 'pending' })
    ]);

    const revenueAgg = await Booking.aggregate([
      { 
        $match: { 
          paymentStatus: 'paid',
          createdAt: { $gte: startOfMonth, $lt: endOfMonth }
        } 
      },
      { $group: { _id: null, totalRevenue: { $sum: '$price' } } }
    ]);

    res.json({
      success: true,
      data: {
        users,
        partners: employees, // Mapping employees to partners count for compatibility
        totalEmployees: employees,
        totalBookings: bookings,
        activeJobs,
        totalRevenue: revenueAgg[0]?.totalRevenue || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// USER MANAGEMENT CRUD
// ==========================================

// @desc    List all users (with search, pagination, and role filters)
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.listUsers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaging(req.query);
    const filter = {};
    
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const [items, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    res.json({ success: true, page, limit, total, data: items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new user
// @route   POST /api/admin/users
// @access  Private (Admin)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    const exists = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (exists) return res.status(409).json({ message: 'User already exists' });

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password,
      role: role || 'user'
    });
    res.status(201).json({ success: true, data: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user details
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = String(name).trim();
    if (email) {
      const emailNorm = String(email).trim().toLowerCase();
      if (emailNorm !== user.email) {
        const emailExists = await User.findOne({ email: emailNorm });
        if (emailExists) return res.status(400).json({ message: 'Email already in use' });
        user.email = emailNorm;
      }
    }
    if (role) {
      if (!['user', 'partner', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      const projectAdminEmail = String(process.env.PROJECT_ADMIN_EMAIL || 'admin@servicehub.com').trim().toLowerCase();
      const isProjectAdmin = user.email.toLowerCase() === projectAdminEmail;
      if (isProjectAdmin && role !== 'admin') {
        return res.status(403).json({ message: 'Project Admin role cannot be changed.' });
      }
      if (role === 'admin' && !isProjectAdmin) {
        return res.status(403).json({ message: 'Only Project Admin account can have admin role.' });
      }
      user.role = role;
    }
    await user.save();
    res.json({ success: true, data: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const projectAdminEmail = String(process.env.PROJECT_ADMIN_EMAIL || 'admin@servicehub.com').trim().toLowerCase();
    if (user.email.toLowerCase() === projectAdminEmail) {
      return res.status(403).json({ message: 'Project Admin account cannot be deleted.' });
    }

    await User.deleteOne({ _id: user._id });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user full details and booking history
// @route   GET /api/admin/users/:id/details
// @access  Private (Admin)
exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fetch bookings for this user
    const bookings = await Booking.find({ user: user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { user, bookings } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user role directly (Legacy API Compatibility)
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin)
exports.updateUserRole = async (req, res) => {
  return exports.updateUser(req, res);
};

// ==========================================
// EMPLOYEE MANAGEMENT CRUD
// ==========================================

// @desc    List employees (with filters, pagination, search)
// @route   GET /api/admin/employees
// @access  Private (Admin)
exports.listEmployees = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaging(req.query);
    const filter = {};
    if (req.query.serviceCategory) filter.serviceCategory = req.query.serviceCategory;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { fullName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { employeeId: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    const [items, total] = await Promise.all([
      Employee.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Employee.countDocuments(filter)
    ]);
    res.json({ success: true, page, limit, total, data: items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new employee
// @route   POST /api/admin/employees
// @access  Private (Admin)
exports.createEmployee = async (req, res) => {
  try {
    const { fullName, email, phone, password, serviceCategory, experience, status } = req.body;
    if (!fullName || !email || !phone || !password || !serviceCategory) {
      return res.status(400).json({ message: 'Full name, email, phone, password, and service category are required.' });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const phoneNorm = String(phone).trim();

    // Check unique email/phone
    const existingEmp = await Employee.findOne({ $or: [{ email: emailNorm }, { phone: phoneNorm }] });
    if (existingEmp) return res.status(409).json({ message: 'Employee with this email or phone already exists.' });

    // Generate EMP ID
    let employeeId = `EMP-${Math.floor(100000 + Math.random() * 900000)}`;
    let idExists = await Employee.findOne({ employeeId });
    while (idExists) {
      employeeId = `EMP-${Math.floor(100000 + Math.random() * 900000)}`;
      idExists = await Employee.findOne({ employeeId });
    }

    // Create Employee (hashed password handled by pre-save schema hook)
    const employee = await Employee.create({
      employeeId,
      fullName: String(fullName).trim(),
      email: emailNorm,
      phone: phoneNorm,
      password,
      serviceCategory,
      experience: Number(experience) || 0,
      status: status || 'active',
      isVerified: true
    });

    // Also create partner so they can login and receive bookings
    await Partner.create({
      employeeId,
      name: String(fullName).trim(),
      email: emailNorm,
      phone: phoneNorm,
      service: serviceCategory === 'tutor' ? 'home-tutor' : serviceCategory,
      experience: Number(experience) || 0,
      address: req.body.address || 'Delhi, India',
      approvalStatus: 'approved',
      verifiedByAdmin: true,
      isAvailable: true
    });

    res.status(201).json({ success: true, data: employee.getPublicProfile() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update employee
// @route   PUT /api/admin/employees/:id
// @access  Private (Admin)
exports.updateEmployee = async (req, res) => {
  try {
    const { fullName, email, phone, serviceCategory, experience, status, rating } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const prevEmail = employee.email;
    const prevEmployeeId = employee.employeeId;

    if (fullName) employee.fullName = String(fullName).trim();
    if (email) employee.email = String(email).trim().toLowerCase();
    if (phone) employee.phone = String(phone).trim();
    if (serviceCategory) employee.serviceCategory = serviceCategory;
    if (experience !== undefined) employee.experience = Number(experience);
    if (status) employee.status = status;
    if (rating !== undefined) employee.rating = Number(rating);

    await employee.save();

    // Sync to Partner
    const partner = await Partner.findOne({ $or: [{ employeeId: prevEmployeeId }, { email: prevEmail }] });
    if (partner) {
      if (fullName) partner.name = String(fullName).trim();
      if (email) partner.email = String(email).trim().toLowerCase();
      if (phone) partner.phone = String(phone).trim();
      if (serviceCategory) partner.service = serviceCategory === 'tutor' ? 'home-tutor' : serviceCategory;
      if (experience !== undefined) partner.experience = Number(experience);
      if (status) {
        partner.isAvailable = status === 'active';
      }
      await partner.save();
    }

    res.json({ success: true, data: employee.getPublicProfile() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete employee
// @route   DELETE /api/admin/employees/:id
// @access  Private (Admin)
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Delete matching Partner
    await Partner.deleteOne({ $or: [{ employeeId: employee.employeeId }, { email: employee.email }] });
    // Delete Employee
    await Employee.deleteOne({ _id: employee._id });

    res.json({ success: true, message: 'Employee and associated partner deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get employee details and bookings
// @route   GET /api/admin/employees/:id
// @access  Private (Admin)
exports.getEmployeeDetails = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-password');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const partner = await Partner.findOne({ $or: [{ employeeId: employee.employeeId }, { email: employee.email }] });
    let bookings = [];
    if (partner) {
      bookings = await Booking.find({ 'agent.partnerId': partner._id }).sort({ createdAt: -1 });
    }

    res.json({ success: true, data: { employee, partner, bookings } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// PARTNER APPLICATIONS
// ==========================================

// @desc    List all partners (applications)
// @route   GET /api/admin/partners
// @access  Private (Admin)
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

// @desc    Approve/Reject partner request and auto-create Employee account
// @route   PUT /api/admin/partners/:id/approval
// @access  Private (Admin)
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

    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ message: 'Partner not found' });

    // If approved, create Employee account if it doesn't exist
    let createdEmployeeCredentials = null;
    if (approvalStatus === 'approved') {
      let employee = await Employee.findOne({ email: partner.email });
      if (!employee) {
        // Generate unique EMP ID
        let employeeId = partner.employeeId || `EMP-${Math.floor(100000 + Math.random() * 900000)}`;
        let idExists = await Employee.findOne({ employeeId });
        while (idExists) {
          employeeId = `EMP-${Math.floor(100000 + Math.random() * 900000)}`;
          idExists = await Employee.findOne({ employeeId });
        }

        const rawPassword = 'welcome123';
        // Create Employee (hashing happens in pre-save hook)
        employee = await Employee.create({
          employeeId,
          fullName: partner.name,
          email: partner.email,
          phone: partner.phone,
          password: rawPassword,
          serviceCategory: partner.service === 'home-tutor' ? 'tutor' : partner.service,
          experience: partner.experience || 0,
          status: 'active',
          isVerified: true
        });

        // Save generated employeeId back to partner
        partner.employeeId = employeeId;
        update.employeeId = employeeId;
        createdEmployeeCredentials = {
          email: partner.email,
          password: rawPassword,
          employeeId
        };
      } else {
        partner.employeeId = employee.employeeId;
        update.employeeId = employee.employeeId;
      }
    }

    // Apply the updates to partner
    Object.assign(partner, update);
    await partner.save();

    res.json({
      success: true,
      data: partner,
      credentials: createdEmployeeCredentials
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete partner
// @route   DELETE /api/admin/partners/:id
// @access  Private (Admin)
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

// ==========================================
// BOOKING MANAGEMENT AND PAYMENT OVERRIDE
// ==========================================

// @desc    List all bookings
// @route   GET /api/admin/bookings
// @access  Private (Admin)
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

// @desc    Update booking details or override payment status with reason
// @route   PUT /api/admin/bookings/:id
// @access  Private (Admin)
exports.updateBookingByAdmin = async (req, res) => {
  try {
    const allowedFields = ['status', 'paymentStatus', 'assignmentStatus', 'progress', 'estimatedArrivalTime', 'shift', 'startTime'];
    const update = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    // Handle payment override details
    if (req.body.paymentStatus !== undefined && req.body.paymentOverrideReason) {
      update.paymentOverrideReason = req.body.paymentOverrideReason;
      update.paymentOverrideBy = req.user ? req.user.email : 'admin';
    }

    const booking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete booking
// @route   DELETE /api/admin/bookings/:id
// @access  Private (Admin)
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

// ==========================================
// EMPLOYEE STATUS MONITORING
// ==========================================

// @desc    Live status monitoring table data
// @route   GET /api/admin/employees/status
// @access  Private (Admin)
exports.getEmployeeStatus = async (req, res) => {
  try {
    // Get all approved partners
    const partners = await Partner.find({ approvalStatus: 'approved' }).lean();
    const partnerIds = partners.map(p => p._id);

    // Get active job count for each partner
    const activeJobs = await Booking.aggregate([
      { $match: { 'agent.partnerId': { $in: partnerIds }, status: 'pending' } },
      { $group: { _id: '$agent.partnerId', count: { $sum: 1 } } }
    ]);
    const jobCountMap = {};
    activeJobs.forEach(j => {
      jobCountMap[String(j._id)] = j.count;
    });

    const statusList = [];
    for (const p of partners) {
      // Find corresponding Employee status
      const employee = await Employee.findOne({ email: p.email }).lean();
      
      let liveStatus = 'Offline';
      if (employee) {
        if (employee.status === 'offline' || employee.status === 'on-leave') {
          liveStatus = employee.status === 'on-leave' ? 'On Break' : 'Offline';
        } else if (p.currentBooking) {
          liveStatus = 'Busy';
        } else if (p.isAvailable) {
          liveStatus = 'Available';
        }
      }

      statusList.push({
        _id: p._id,
        employeeId: p.employeeId || '-',
        name: p.name,
        email: p.email,
        service: p.service,
        status: liveStatus,
        shift: p.preferredShift || 'Both Shifts',
        activeJobs: jobCountMap[String(p._id)] || 0,
        lastActive: p.lastAssignedAt || p.createdAt
      });
    }

    res.json({ success: true, data: statusList });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// REPORTS & ANALYTICS
// ==========================================

// @desc    Reports & Analytics
// @route   GET /api/admin/reports
// @access  Private (Admin)
exports.getReports = async (req, res) => {
  try {
    // 1) Revenue Trends: last 6 months completed/paid bookings
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0,0,0,0);

    const revenueTrends = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$price' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format revenue trend response
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedRevenue = revenueTrends.map(r => {
      const label = `${months[r._id.month - 1]} ${r._id.year}`;
      return { label, revenue: r.revenue, count: r.bookings };
    });

    // 2) Booking Statistics: pending, completed, cancelled counts
    const bookingStats = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    const formattedStats = { pending: 0, completed: 0, cancelled: 0 };
    bookingStats.forEach(s => {
      if (formattedStats[s._id] !== undefined) {
        formattedStats[s._id] = s.count;
      }
    });

    // 3) Top Employees
    const topEmployees = await Employee.find({})
      .sort({ rating: -1, totalJobsCompleted: -1 })
      .limit(5)
      .select('fullName employeeId serviceCategory rating totalJobsCompleted totalRevenue')
      .lean();

    // 4) Top Services
    const topServices = await Booking.aggregate([
      {
        $group: {
          _id: '$serviceName',
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const formattedServices = topServices.map(s => ({
      name: s._id,
      count: s.count,
      revenue: s.revenue
    }));

    res.json({
      success: true,
      data: {
        revenueTrends: formattedRevenue,
        bookingStats: formattedStats,
        topEmployees,
        topServices: formattedServices
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// SERVICES CATEGORIES (Compatibility)
// ==========================================

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
