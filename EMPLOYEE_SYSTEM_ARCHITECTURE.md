# Employee Dashboard System - Architecture & Design Overview

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE (Frontend)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐              ┌──────────────────┐       │
│  │ EMPLOYEE LOGIN   │              │   DASHBOARD      │       │
│  │                  │  ─(JWT)─→   │                  │       │
│  │ • Email Field    │              │ • Stats Cards    │       │
│  │ • Password Field │              │ • Booking Table  │       │
│  │ • Remember Me    │              │ • Profile Panel  │       │
│  │ • Error Msgs     │              │ • Revenue Chart  │       │
│  │                  │              │ • Notifications  │       │
│  └──────────────────┘              └──────────────────┘       │
│           ↑                                ↑                     │
│           │ (Login Request)                │ (API Calls)       │
│           │                                │                   │
└───────────┼────────────────────────────────┼───────────────────┘
            │                                │
            │ HTTP/REST API                  │
            │                                │
┌───────────┼────────────────────────────────┼───────────────────┐
│           │       SERVER SIDE (Backend)    │                   │
│           ↓                                ↓                   │
│  ┌────────────────────────────────────────────┐               │
│  │         EXPRESS SERVER (port 5000)         │               │
│  └────────────────────────────────────────────┘               │
│           ↑                                                   │
│           │ Routes                                           │
│           │                                                  │
│  ┌────────┴──────────────────────────────────┐              │
│  │       EMPLOYEE ROUTES                     │              │
│  ├───────────────────────────────────────────┤              │
│  │                                           │              │
│  │ POST   /api/employee/login                │              │
│  │        → employeeController.login()       │              │
│  │                                           │              │
│  │ GET    /api/employee/profile              │              │
│  │ PUT    /api/employee/profile              │              │
│  │        → employeeController.getProfile() │              │
│  │                                           │              │
│  │ GET    /api/employee/dashboard-stats      │              │
│  │        → employeeController.getDashboard │              │
│  │                                           │              │
│  │ GET    /api/employee/bookings             │              │
│  │ POST   /api/employee/bookings/:id/accept  │              │
│  │ POST   /api/employee/bookings/:id/start   │              │
│  │ POST   /api/employee/bookings/:id/complete│◄─┐ PAYMENT  │
│  │        → Payment Verification ⭐          │  │ CHECK    │
│  │ POST   /api/employee/bookings/:id/cancel  │  │          │
│  │                                           │  │          │
│  │ GET    /api/employee/customer/:id/history │  │          │
│  │        → employeeController functions    │  │          │
│  │                                           │  │          │
│  └───────────────────────────────────────────┘  │          │
│           ↑                                      │          │
│           │ Middleware                          │          │
│           │                                      │          │
│  ┌────────┴──────────────────────────────────┐  │          │
│  │  employeeAuthMiddleware (JWT Validation)  │  │          │
│  │                                           │  │          │
│  │ • Extract token from header               │  │          │
│  │ • Verify JWT signature                    │  │          │
│  │ • Check token expiry (7 days)             │  │          │
│  │ • Attach employee ID to request           │  │          │
│  │ • Return 401 if invalid/expired           │  │          │
│  │                                           │  │          │
│  └───────────────────────────────────────────┘  │          │
│           ↑                                      │          │
│           │ Data Access                         │          │
│           │                                      │          │
│  ┌────────┴──────────────────────────────────┐  │          │
│  │         MONGODB DATABASE                  │  │          │
│  ├───────────────────────────────────────────┤  │          │
│  │                                           │  │          │
│  │ ┌─ Employee Collection                   │  │          │
│  │ │  {                                      │  │          │
│  │ │    _id, employeeId, fullName,          │  │          │
│  │ │    email, phone, password,             │  │          │
│  │ │    serviceCategory, experience,        │  │          │
│  │ │    rating, totalJobsCompleted,         │  │          │
│  │ │    totalRevenue, ...                   │  │          │
│  │ │  }                                      │  │          │
│  │ └─                                        │  │          │
│  │                                           │  │          │
│  │ ┌─ Booking Collection                    │  │          │
│  │ │  {                                      │  │          │
│  │ │    _id, bookingId, employeeId,         │  │          │
│  │ │    customerId, status,                 │  │          │
│  │ │    paymentStatus ◄─────────────────────┼──┘  VERIFY  │
│  │ │    amount, ...                          │             │
│  │ │  }                                      │             │
│  │ └─                                        │             │
│  │                                           │             │
│  └───────────────────────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow: Booking Completion with Payment Verification

```
EMPLOYEE INITIATES COMPLETION
        │
        ↓
┌─────────────────────────────┐
│ Click "Mark Completed"      │
│ frontend/dashboard.html     │
└──────────┬──────────────────┘
           │
           │ POST /api/employee/bookings/:id/complete
           │ Header: "Authorization: Bearer {token}"
           ↓
┌─────────────────────────────────────────────────┐
│ SERVER: employeeAuthMiddleware                  │
│                                                 │
│ ✓ Extract token from header                    │
│ ✓ Verify JWT signature                         │
│ ✓ Check expiry (7 days)                        │
│ ✓ Attach employee ID to request                │
└──────────┬──────────────────────────────────────┘
           │ If invalid: Return 401 Unauthorized
           │
           ↓
┌──────────────────────────────────────────────────┐
│ SERVER: employeeController.completeBooking()    │
│                                                  │
│ Step 1: Fetch booking from database             │
│         booking = await Booking.findById(id)    │
│                                                  │
│ Step 2: ⭐ CRITICAL PAYMENT CHECK ⭐           │
│         if (booking.paymentStatus !== 'completed')
│                                                  │
│    ├─ YES (paymentStatus = 'completed')        │
│    │       ↓                                     │
│    │   ┌──────────────────────────────────────┐│
│    │   │ Update booking:                       ││
│    │   │ • status = 'completed'                ││
│    │   │ • completedAt = Date.now()            ││
│    │   │ • save to database                    ││
│    │   └───────────┬──────────────────────────┘│
│    │               │                            │
│    │               ↓                            │
│    │   ┌──────────────────────────────────────┐│
│    │   │ Update employee:                      ││
│    │   │ • totalJobsCompleted += 1             ││
│    │   │ • totalRevenue += amount              ││
│    │   │ • save to database                    ││
│    │   └───────────┬──────────────────────────┘│
│    │               │                            │
│    │               ↓                            │
│    │   ┌──────────────────────────────────────┐│
│    │   │ Response SUCCESS:                     ││
│    │   │ {                                      ││
│    │   │   success: true,                       ││
│    │   │   message: "Booking completed",       ││
│    │   │   booking: {...}                       ││
│    │   │ }                                      ││
│    │   └──────────────────────────────────────┘│
│    │                                            │
│    └─ NO (paymentStatus = 'pending')           │
│           ↓                                     │
│       ┌──────────────────────────────────────┐ │
│       │ Response ERROR:                       │ │
│       │ {                                      │ │
│       │   success: false,                      │ │
│       │   message: "Payment not completed",   │ │
│       │   currentPaymentStatus: 'pending'     │ │
│       │ }                                      │ │
│       └──────────────────────────────────────┘ │
│                                                  │
└──────────┬───────────────────────────────────────┘
           │
           ↓
        FRONTEND
        
    ├─ If SUCCESS:
    │  • Update booking status in table
    │  • Show success message
    │  • Refresh dashboard stats
    │  • Update revenue display
    │  • Show notification
    │
    └─ If ERROR:
       • Show error: "Payment not completed yet"
       • Keep booking as "In Progress"
       • Employee waits for payment
```

---

## 🎯 Booking Status Lifecycle

```
BOOKING CREATED
     │
     ├─ paymentStatus: 'pending'
     ├─ status: 'pending'
     └─ No employee assigned yet
           │
           ↓
    PENDING → Employee sees in dashboard
    (Awaiting employee acceptance)
           │
           │ Employee clicks "Accept"
           │ [POST /api/employee/bookings/:id/accept]
           ↓
    ACCEPTED
    (Ready to work)
    paymentStatus: can be 'pending' or 'completed'
           │
           │ If payment is received:
           │ paymentStatus → 'completed'
           │
           │ Employee clicks "Start Work"
           │ [POST /api/employee/bookings/:id/start]
           ↓
    IN PROGRESS
    (Currently working on job)
           │
           │ Once work is done AND payment received:
           │ paymentStatus must be 'completed'
           │
           │ Employee clicks "Mark Completed"
           │ [POST /api/employee/bookings/:id/complete]
           │
           │ System checks:
           │ if paymentStatus !== 'completed'?
           ├─ YES (payment received) → ✅ Continue
           └─ NO (payment pending) → ❌ Show error
           │
           ↓ (if payment verified)
    COMPLETED ✅
    (Job finished successfully)
    • status = 'completed'
    • completedAt = timestamp
    • Revenue calculated and added
    • Employee total updated
    • Dashboard stats updated
           │
           └─ Customer can rate/review

Alternative:
    PENDING/ACCEPTED/IN PROGRESS
           │
           │ Either employee or customer cancels
           │ [POST /api/employee/bookings/:id/cancel]
           ↓
    CANCELLED ❌
    • Refund processed if applicable
    • Not counted in revenue
    • Not counted in job completion
```

---

## 💰 Revenue Tracking System

```
┌──────────────────────────────────────────┐
│    BOOKING COMPLETION TRIGGERS UPDATE    │
└────────────┬─────────────────────────────┘
             │
             ↓
     When status = 'completed'
             │
             ├─ Fetch booking amount: ₹850
             │
             ├─ Update employee.totalRevenue
             │  totalRevenue = (previous) + 850
             │
             ├─ Update employee.totalJobsCompleted
             │  totalJobsCompleted = (previous) + 1
             │
             └─ Save to database
                      │
                      ↓
        ┌─────────────────────────────┐
        │   DASHBOARD UPDATES AUTO    │
        ├─────────────────────────────┤
        │                             │
        │ totalJobsCompleted: 28 → 29│
        │ totalRevenue: 32800 → 33650│
        │                             │
        │ Aggregated stats:           │
        │ • Daily Revenue: +850       │
        │ • Weekly Revenue: +850      │
        │ • Monthly Revenue: +850     │
        │                             │
        └─────────────────────────────┘
                      │
                      ↓
        FRONTEND DISPLAYS LIVE UPDATES
        (On next dashboard refresh)
```

---

## 🔐 Authentication & Authorization Flow

```
┌──────────────────────────┐
│  Employee enters:         │
│  • Employee ID            │
│  • Password               │
└────────────┬──────────────┘
             │
             ↓
    ┌────────────────────────────┐
    │ POST /api/employee/login   │
    └────────────┬───────────────┘
                 │
                 ↓
    ┌──────────────────────────────────────┐
    │ Backend: employeeController.login()   │
    │                                       │
    │ 1. Find employee in DB                │
    │    if (!employee)                     │
    │      return 401 "Invalid ID"          │
    │                                       │
    │ 2. Compare password with hash         │
    │    if (!match)                        │
    │      return 401 "Invalid password"    │
    │                                       │
    │ 3. Check if verified                  │
    │    if (!isVerified)                   │
    │      return 403 "Not verified"        │
    │                                       │
    │ 4. Generate JWT token                 │
    │    token = jwt.sign(                  │
    │      { employeeId: emp._id },         │
    │      SECRET,                          │
    │      { expiresIn: '7d' }              │
    │    )                                  │
    │                                       │
    │ 5. Return token to frontend           │
    └────────────┬──────────────────────────┘
                 │
                 ↓
    ┌──────────────────────────────┐
    │ Frontend receives token:      │
    │ {                             │
    │   token: "eyJ0eXAi...",      │
    │   employeeId: "EMP-001245",  │
    │   fullName: "Amit Sharma"    │
    │ }                             │
    │                               │
    │ localStorage.setItem(         │
    │   'employeeToken', token      │
    │ )                             │
    └────────────┬──────────────────┘
                 │
                 ↓
    ┌──────────────────────────────┐
    │ Redirect to dashboard         │
    │ window.location.href =        │
    │   '/employee/dashboard.html'  │
    └──────────────────────────────┘

────────────────────────────────────────

ON SUBSEQUENT REQUESTS:
    Dashboard makes API call
             │
             ↓
    GET /api/employee/profile
    Header: "Authorization: Bearer {token}"
             │
             ↓
    ┌──────────────────────────────────┐
    │ employeeAuthMiddleware:           │
    │                                   │
    │ 1. Extract token from header      │
    │ 2. Verify JWT signature           │
    │    if (!valid)                    │
    │      return 401                   │
    │ 3. Check expiry (7 days)          │
    │    if (expired)                   │
    │      return 401 "Token expired"   │
    │ 4. Decode and extract employeeId  │
    │    req.employee = { id: ... }     │
    │ 5. Call next middleware           │
    │                                   │
    └────────────┬─────────────────────┘
                 │
                 ↓
    ┌──────────────────────────────┐
    │ Controller can now use:       │
    │ req.employee.id               │
    │ to fetch only this employee's │
    │ data from database            │
    └──────────────────────────────┘
```

---

## 🗂️ Database Schema Relationships

```
┌─────────────────────────────┐
│     EMPLOYEE (Table)        │
├─────────────────────────────┤
│ _id (PK)                    │
│ employeeId (unique)         │
│ fullName                    │
│ email                       │
│ phone                       │
│ password (hashed)           │
│ serviceCategory             │
│ experience                  │
│ rating (0-5)                │
│ reviewCount                 │
│ totalJobsCompleted          │
│ totalRevenue                │
│ location {                  │
│   city, state, pincode      │
│ }                           │
│ status (active/offline)     │
│ isVerified                  │
│ joinedDate                  │
│ createdAt, updatedAt        │
└────────────┬────────────────┘
             │
             │ (1:Many)
             │ Employee has many bookings
             │
             ↓
┌─────────────────────────────┐
│    BOOKING (Table)          │
├─────────────────────────────┤
│ _id (PK)                    │
│ bookingId                   │
│ employeeId (FK)──────┐      │
│ customerId (FK)      │      │
│ serviceId (FK)       │      │
│ status               │      │
│ paymentStatus ◄──────┤      │
│ amount               │      │
│ paymentId            │      │
│ createdAt            │      │
│ acceptedAt           │      │
│ startedAt            │      │
│ completedAt          │      │
│ cancelledAt          │      │
└─────────────────────┬───────┘
                      │
                      │ Payment verification
                      │ logic applies here
                      │
                      ↓
            When completing booking:
            
            if (booking.paymentStatus
                !== 'completed')
              return error("Not paid")
            else
              update status to 'completed'
              update employee revenue
```

---

## 🎨 Component Hierarchy

```
EMPLOYEE DASHBOARD
│
├─ Header Component
│  ├─ Welcome Text + Date
│  ├─ Notification Button (with badge)
│  ├─ Profile Menu
│  └─ Logout Button
│
├─ Stats Grid (4 columns on desktop, responsive)
│  ├─ Total Jobs Card
│  ├─ Today's Jobs Card
│  ├─ Weekly Revenue Card
│  ├─ Monthly Revenue Card
│  ├─ Pending Jobs Card
│  ├─ Average Rating Card
│  ├─ Weekly Jobs Card
│  └─ Monthly Jobs Card
│
├─ Main Content Grid (2 columns)
│  │
│  ├─ Left Column (2/3 width)
│  │  │
│  │  └─ Bookings Card
│  │     ├─ Filter Buttons
│  │     │  ├─ All
│  │     │  ├─ Pending
│  │     │  ├─ Accepted
│  │     │  ├─ In Progress
│  │     │  └─ Completed
│  │     │
│  │     └─ Bookings Table
│  │        └─ Rows with action buttons
│  │           ├─ Accept Button
│  │           ├─ Start Button
│  │           └─ Complete Button
│  │              (with payment check)
│  │
│  └─ Right Column (1/3 width)
│     ├─ Profile Card
│     │  ├─ Profile Photo
│     │  ├─ Name & ID
│     │  ├─ Status Badge
│     │  ├─ Info Details
│     │  └─ Edit Profile Button
│     │
│     └─ Revenue Chart
│        └─ Line Chart (7-day trend)
│
├─ Notification Panel (fixed position)
│  └─ Notification Items
│     ├─ New Booking
│     ├─ Payment Received
│     ├─ Booking Cancelled
│     └─ Service Reminder
│
└─ Modals
   └─ Booking Details Modal
      ├─ Booking Info Display
      └─ Action Buttons
```

---

## 🚀 Deployment Checklist

### Before Going Live

- [ ] Update JWT_SECRET in .env (strong random string)
- [ ] Configure MongoDB connection (production instance)
- [ ] Enable HTTPS/SSL certificate
- [ ] Set CORS origin to production domain
- [ ] Enable rate limiting on login endpoint
- [ ] Setup database backups
- [ ] Configure email notifications
- [ ] Test payment verification logic
- [ ] Setup error logging (Sentry/LogRocket)
- [ ] Configure admin notification system
- [ ] Setup employee verification workflow
- [ ] Test all API endpoints
- [ ] Mobile responsiveness test
- [ ] Performance testing
- [ ] Security audit

---

## 📈 Future Enhancements

### Phase 2
- [ ] Real-time notifications (Socket.io)
- [ ] Video call feature
- [ ] Work history export (PDF)
- [ ] Performance analytics
- [ ] Employee withdrawal system

### Phase 3
- [ ] ML-based workload optimization
- [ ] Predictive earnings
- [ ] Auto-assignment based on location
- [ ] Integration with accounting software
- [ ] Multi-language support

---

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** May 27, 2026

