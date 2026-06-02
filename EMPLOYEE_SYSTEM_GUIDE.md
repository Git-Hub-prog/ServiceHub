# Employee Profile & Dashboard System - Design & Management Guide

## 📋 Project Overview

This is a comprehensive **Employee Profile & Dashboard System** for a multi-service home service platform (ServiceHub) that enables employees to manage their profile, bookings, earnings, and customer relationships.

### Platform Services Supported:
- 🔧 Plumbing
- ⚡ Electrical
- ❄️ AC Repair & Maintenance
- 💇 Salon at Home
- 🚗 Car Cleaning
- 📚 Tutoring

---

## 🏗️ System Architecture

### Frontend Structure
```
frontend/
├── employee/
│   ├── login.html           # Employee login page
│   └── dashboard.html       # Main employee dashboard
└── (other existing pages)
```

### Backend Structure
```
backend/
├── models/
│   └── Employee.js          # Employee schema & database model
├── controllers/
│   └── employeeController.js # Business logic
├── middleware/
│   └── employeeAuthMiddleware.js # JWT authentication
├── routes/
│   └── employeeRoutes.js    # API endpoints
└── server.js                # Updated with employee routes
```

---

## 🔐 1. AUTHENTICATION SYSTEM

### Login Architecture
**Endpoint:** `POST /api/employee/login`

#### Request Body:
```json
{
  "employeeId": "EMP-001245",
  "password": "securePassword123"
}
```

#### Response (Success):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "employeeId": "EMP-001245",
  "fullName": "Amit Sharma",
  "email": "amit@email.com",
  "serviceCategory": "plumber"
}
```

#### Response (Failed):
```json
{
  "success": false,
  "message": "Invalid employee ID or password"
}
```

### JWT Token Management
- **Issued on:** Employee login
- **Expiry:** 7 days
- **Storage:** LocalStorage (`employeeToken`)
- **Usage:** Bearer token in Authorization header

### Protected Routes
All dashboard routes require JWT authentication in header:
```
Authorization: Bearer {token}
```

---

## 👤 2. EMPLOYEE PROFILE PAGE

### Profile Data Model
```javascript
{
  employeeId: "EMP-001245",           // Unique identifier
  fullName: "Amit Sharma",
  email: "amit@email.com",
  phone: "+91 98765 43210",
  profilePhoto: "url/to/photo.jpg",
  serviceCategory: "plumber",         // plumber, electrician, ac-repair, etc.
  experience: 5,                      // Years of experience
  rating: 4.8,                        // Average customer rating (0-5)
  reviewCount: 42,                    // Number of customer reviews
  location: {
    city: "Delhi",
    state: "Delhi",
    pincode: "110001"
  },
  status: "active",                   // active, offline, on-leave
  totalJobsCompleted: 28,
  totalRevenue: 32800,                // Total earnings in ₹
  joinedDate: "2019-01-15",
  isVerified: true
}
```

### UI Components
1. **Profile Photo**
   - Display with glassmorphism effect
   - Circular avatar (120x120px)
   - Gradient background if no image
   - Animated on load

2. **Employee Info Display**
   - Name (bold, 22px)
   - Employee ID
   - Current Status (Active/Offline badge)
   - Service Category with icon
   - Experience (years)
   - Contact Info (phone, email)
   - Location (city, state)
   - Joined Date

3. **Action Buttons**
   - Edit Profile Button
   - Change Password
   - Update Bank Details

### Edit Profile Endpoint
**Endpoint:** `PUT /api/employee/profile`

```json
{
  "fullName": "Amit Sharma",
  "phone": "+91 98765 43210",
  "experience": 5,
  "location": {
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001"
  },
  "profilePhoto": "url/to/new/photo.jpg"
}
```

---

## 📊 3. DASHBOARD WITH ANALYTICS

### Dashboard Stats Cards
**Endpoint:** `GET /api/employee/dashboard-stats`

#### Response:
```json
{
  "success": true,
  "stats": {
    "totalJobsCompleted": 28,       // All-time jobs
    "todayJobs": 3,                 // Jobs completed today
    "weeklyJobs": 12,               // Jobs completed this week
    "monthlyJobs": 48,              // Jobs completed this month
    "pendingJobs": 5,               // Awaiting acceptance
    "totalRevenue": 32800,          // Total earnings (₹)
    "weeklyRevenue": 8450,          // This week's earnings (₹)
    "monthlyRevenue": 32800,        // This month's earnings (₹)
    "avgRating": 4.8,               // Customer rating (0-5)
    "reviewCount": 42               // Total reviews
  }
}
```

### Stat Cards Display

| Card | Value | Description |
|------|-------|-------------|
| Total Jobs | 28 | All-time completed jobs |
| Today's Jobs | 3 | Completed today |
| Weekly Revenue | ₹8,450 | This week's earnings |
| Monthly Revenue | ₹32,800 | This month's earnings |
| Pending Jobs | 5 | Awaiting your acceptance |
| Avg Rating | 4.8⭐ | From 42 reviews |
| Weekly Jobs | 12 | Completed this week |
| Monthly Jobs | 48 | Completed this month |

### Charts & Visualizations
- **Revenue Trend Chart**: Line chart showing daily revenue for the week
- **Job Distribution**: Pie chart (jobs by category)
- **Performance Graph**: Area chart showing completion rate

---

## 📋 4. BOOKING MANAGEMENT

### Booking Data Model
```javascript
{
  _id: "booking123",
  bookingId: "#BK001",
  customerId: "customer123",
  customerName: "Raj Kumar",
  customerPhone: "+91 98765 12345",
  customerAddress: "123 Main St, Delhi",
  employeeId: "employee123",
  serviceId: "service123",
  serviceName: "Plumbing Repair",
  bookingDate: "2026-05-27",
  timeSlot: "2:00 PM - 3:00 PM",
  amount: 850,
  status: "pending",              // pending, accepted, inprogress, completed, cancelled
  paymentStatus: "pending",       // pending, completed, failed
  paymentId: "razorpay_pay_123",
  notes: "Fix leaking tap",
  createdAt: "2026-05-27T10:00:00Z",
  acceptedAt: "2026-05-27T11:00:00Z",
  startedAt: "2026-05-27T13:45:00Z",
  completedAt: "2026-05-27T14:30:00Z",
  cancellationReason: null
}
```

### Booking Status Workflow

```
┌─────────┐
│ PENDING │  ← Initial state when booking is created
└────┬────┘
     │ Employee accepts booking
     ↓
┌──────────┐
│ ACCEPTED │  ← Ready to start work
└────┬────┘
     │ Employee clicks "Start Work"
     ↓
┌────────────┐
│ IN PROGRESS│  ← Currently working on the job
└────┬───────┘
     │ Employee clicks "Mark Completed"
     │ (Only if payment is completed)
     ↓
┌───────────┐
│ COMPLETED │  ← Job finished successfully
└───────────┘

Alternative path:
     │ Employee/Customer cancels
     ↓
┌───────────┐
│ CANCELLED │  ← Job cancelled
└───────────┘
```

### Booking Endpoints

#### 1. Get All Employee Bookings
**Endpoint:** `GET /api/employee/bookings`

**Query Parameters:**
```
?status=pending&limit=20&page=1
```

**Response:**
```json
{
  "success": true,
  "bookings": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "total": 20
  }
}
```

#### 2. Accept Booking
**Endpoint:** `POST /api/employee/bookings/:bookingId/accept`

**Response:**
```json
{
  "success": true,
  "message": "Booking accepted successfully",
  "booking": { ... }
}
```

#### 3. Start Work
**Endpoint:** `POST /api/employee/bookings/:bookingId/start`

**Response:**
```json
{
  "success": true,
  "message": "Work started",
  "booking": { ... }
}
```

#### 4. Complete Booking (WITH PAYMENT VERIFICATION)
**Endpoint:** `POST /api/employee/bookings/:bookingId/complete`

**Important:** This endpoint includes critical payment verification logic:

```javascript
// CRITICAL CHECK
if (booking.paymentStatus !== 'completed') {
  return {
    success: false,
    message: 'Payment not completed yet. Cannot mark as completed.',
    currentPaymentStatus: booking.paymentStatus
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Booking completed successfully",
  "booking": { ... }
}
```

**Response (Failed - No Payment):**
```json
{
  "success": false,
  "message": "Payment not completed yet. Cannot mark as completed.",
  "currentPaymentStatus": "pending"
}
```

#### 5. Cancel Booking
**Endpoint:** `POST /api/employee/bookings/:bookingId/cancel`

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

---

## 💰 5. PAYMENT VERIFICATION LOGIC

### Critical Requirement
**Before marking a booking as COMPLETED, the system MUST verify payment.**

### Implementation
```javascript
exports.completeBooking = async (req, res) => {
  // Step 1: Fetch booking
  const booking = await Booking.findById(bookingId);
  
  // Step 2: CHECK PAYMENT STATUS ⚠️ CRITICAL
  if (booking.paymentStatus !== 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Payment not completed yet. Cannot mark as completed.'
    });
  }
  
  // Step 3: Update booking status
  booking.status = 'completed';
  booking.completedAt = Date.now();
  await booking.save();
  
  // Step 4: Update employee stats
  employee.totalJobsCompleted += 1;
  employee.totalRevenue += booking.amount;
  await employee.save();
};
```

### Payment Status Flow

| Status | Meaning | Can Complete? |
|--------|---------|---------------|
| `pending` | Payment awaiting | ❌ NO |
| `completed` | Payment successful | ✅ YES |
| `failed` | Payment failed | ❌ NO |
| `refunded` | Payment refunded | ❌ NO |

### UI Notification
When employee tries to complete without payment:
```
⚠️ Error Message
"Payment not completed yet. 
Cannot mark as completed."
```

---

## 💵 6. REVENUE CALCULATION

### Automatic Revenue Updates

#### When Booking is Completed
```javascript
// Recalculate revenue
employee.totalRevenue += booking.amount;
employee.totalJobsCompleted += 1;
await employee.save();
```

#### Revenue Categories

1. **Total Revenue**: Sum of all completed bookings
2. **Weekly Revenue**: Sum of completed bookings this week
3. **Monthly Revenue**: Sum of completed bookings this month
4. **Daily Revenue**: Sum of completed bookings today

### Revenue Calculation Endpoint
```javascript
GET /api/employee/dashboard-stats

Response:
{
  "totalRevenue": 32800,
  "weeklyRevenue": 8450,
  "monthlyRevenue": 32800,
  "dailyRevenue": 2150
}
```

### Revenue Breakdown Report
```
Weekly Revenue Report:
├── Monday:    ₹1,200
├── Tuesday:   ₹1,900
├── Wednesday: ₹1,500
├── Thursday:  ₹2,200
├── Friday:    ₹1,800
├── Saturday:  ₹2,400
└── Sunday:    ₹1,600
────────────────────
Total Weekly: ₹12,600
```

---

## 👥 7. CUSTOMER WORK HISTORY

### Get Customer History
**Endpoint:** `GET /api/employee/customer/:customerId/history`

**Response:**
```json
{
  "success": true,
  "customerHistory": {
    "totalCompleted": 12,
    "totalRevenue": 8900,
    "bookings": [
      {
        "bookingId": "#BK001",
        "serviceName": "Plumbing Repair",
        "date": "2026-05-27",
        "amount": 850,
        "rating": 5,
        "review": "Excellent work, very professional"
      },
      // ... more bookings
    ]
  }
}
```

### Customer History Features
- **Search**: Find customers by name/phone
- **Filter**: Filter by date range, service type, rating
- **Sort**: Sort by date, amount, rating
- **Export**: Download history as PDF/CSV

### Displaying Customer Work History

| Booking ID | Date | Service | Amount | Rating | Status |
|-----------|------|---------|--------|--------|--------|
| #BK001 | May 27 | Plumbing Repair | ₹850 | ⭐⭐⭐⭐⭐ | Completed |
| #BK002 | May 25 | Leak Detection | ₹500 | ⭐⭐⭐⭐ | Completed |
| #BK003 | May 23 | Tap Installation | ₹1,200 | ⭐⭐⭐⭐⭐ | Completed |

---

## 🔔 8. NOTIFICATIONS SYSTEM

### Notification Types

#### 1. New Booking Assigned
```json
{
  "type": "booking_assigned",
  "title": "New Booking Assigned",
  "message": "Plumbing repair at Delhi Gate",
  "bookingId": "#BK001",
  "timestamp": "2026-05-27T10:30:00Z"
}
```

#### 2. Booking Cancelled
```json
{
  "type": "booking_cancelled",
  "title": "Booking Cancelled",
  "message": "Customer cancelled booking #BK005",
  "bookingId": "#BK005",
  "timestamp": "2026-05-27T14:00:00Z"
}
```

#### 3. Payment Received
```json
{
  "type": "payment_received",
  "title": "Payment Received",
  "message": "₹850 credited for booking #BK001",
  "bookingId": "#BK001",
  "amount": 850,
  "timestamp": "2026-05-27T15:30:00Z"
}
```

#### 4. Service Reminder
```json
{
  "type": "service_reminder",
  "title": "Service Reminder",
  "message": "Reminder: Service at 2:00 PM today",
  "bookingId": "#BK001",
  "timeUntilService": 120, // minutes
  "timestamp": "2026-05-27T13:00:00Z"
}
```

### Notification Panel Features
- Real-time badge counter
- Notification history
- Mark as read/unread
- Delete notifications
- Filter by type

---

## 🎨 9. UI/UX DESIGN

### Design System

#### Color Palette
- **Primary**: `#667eea` (Blue)
- **Secondary**: `#764ba2` (Purple)
- **Success**: `#51cf66` (Green)
- **Danger**: `#ff6b6b` (Red)
- **Warning**: `#ffd93d` (Yellow)
- **Neutral**: `#f5f7fa` to `#c3cfe2` (Gradient)

#### Design Principles

1. **Glassmorphism**
   - Semi-transparent cards
   - Backdrop blur effects
   - Gradient overlays

2. **Responsive Design**
   - Mobile-first approach
   - Tablet optimization
   - Desktop full-width layout

3. **Animation**
   - Smooth transitions (0.3s)
   - Fade-in effects on load
   - Hover animations
   - Loading spinners

4. **Typography**
   - **Headers**: Segoe UI, Bold (24-28px)
   - **Body**: Segoe UI, Regular (13-14px)
   - **Labels**: Segoe UI, Semibold (13px)

### Responsive Breakpoints
```css
Mobile:  < 600px
Tablet:  600px - 1024px
Desktop: > 1024px
```

---

## 🗄️ 10. DATA MANAGEMENT STRATEGY

### Database Tables

#### Employee Table
```
employee
├── _id (ObjectId)
├── employeeId (String, unique)
├── fullName (String)
├── email (String)
├── phone (String)
├── password (String - hashed)
├── profilePhoto (String - URL)
├── serviceCategory (String - enum)
├── experience (Number)
├── rating (Number)
├── reviewCount (Number)
├── location (Object)
├── status (String - enum)
├── totalJobsCompleted (Number)
├── totalRevenue (Number)
├── joinedDate (Date)
├── isVerified (Boolean)
├── bankDetails (Object)
├── createdAt (Date)
└── updatedAt (Date)
```

#### Booking Table Reference
```
booking
├── _id (ObjectId)
├── bookingId (String)
├── employeeId (ObjectId - ref to Employee)
├── customerId (ObjectId - ref to Customer)
├── serviceId (ObjectId - ref to Service)
├── status (String - enum)
├── paymentStatus (String - enum) ⭐ CRITICAL
├── amount (Number)
├── createdAt (Date)
├── acceptedAt (Date)
├── startedAt (Date)
├── completedAt (Date)
└── cancelledAt (Date)
```

### Indexing Strategy
```javascript
// Improve query performance
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ email: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ serviceCategory: 1 });

bookingSchema.index({ employeeId: 1, status: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ createdAt: -1 });
```

### Data Backup Strategy
- **Frequency**: Daily backups
- **Retention**: 30 days
- **Location**: Cloud storage
- **Recovery**: Full restore capability

---

## 🔒 11. SECURITY CONSIDERATIONS

### Password Security
```javascript
// Bcrypt hashing with 10 salt rounds
const salt = await bcryptjs.genSalt(10);
const hashedPassword = await bcryptjs.hash(password, salt);
```

### JWT Token Security
- **Secret**: Environment variable (`JWT_SECRET`)
- **Expiry**: 7 days
- **Algorithm**: HS256
- **Storage**: LocalStorage (not ideal for production - use HttpOnly cookies)

### Data Validation
```javascript
// Validation on all inputs
if (!employeeId || !password) {
  return error('Invalid input');
}

// Sanitize database queries
const employee = await Employee.findOne({ employeeId }).lean();
```

### Protected Routes
```javascript
// All profile/booking routes require authentication
router.get('/profile', employeeAuthMiddleware, controller);
```

---

## 📱 12. MOBILE RESPONSIVENESS

### Mobile Navigation
- Hamburger menu for nav items
- Full-width cards
- Touch-friendly buttons (48x48px minimum)
- Bottom navigation bar

### Tablet Layout
- 2-column grid for stats
- Stacked sections
- Optimized spacing

### Desktop Layout
- 4-column stat cards
- 2-column main content
- Side panel for profile

---

## 🚀 13. DEPLOYMENT & TESTING

### API Testing Checklist

#### Employee Login
- [ ] Valid credentials → Success
- [ ] Invalid credentials → Error
- [ ] Missing fields → Error
- [ ] Unverified account → Error

#### Booking Management
- [ ] Accept pending booking → Success
- [ ] Start accepted booking → Success
- [ ] Complete without payment → Error ⭐ CRITICAL
- [ ] Complete with payment → Success

#### Revenue Calculation
- [ ] Daily revenue calculation → Correct
- [ ] Weekly revenue calculation → Correct
- [ ] Monthly revenue calculation → Correct
- [ ] Stats update on completion → Success

---

## 📝 13. USAGE EXAMPLES

### Example 1: Complete Employee Login Flow
```javascript
// 1. Employee enters credentials
employeeId: "EMP-001245"
password: "securePass123"

// 2. Frontend sends to login endpoint
POST /api/employee/login

// 3. Backend verifies and returns token
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "employeeId": "EMP-001245"
}

// 4. Token stored in localStorage
localStorage.setItem('employeeToken', token);

// 5. Redirect to dashboard
window.location.href = '/employee/dashboard.html';
```

### Example 2: Complete Booking Workflow
```javascript
// 1. Booking received (status: pending)
// 2. Employee clicks "Accept"
POST /api/employee/bookings/booking123/accept
// → status: accepted

// 3. Employee clicks "Start Work"
POST /api/employee/bookings/booking123/start
// → status: inprogress

// 4. Work completed, employee clicks "Mark Completed"
POST /api/employee/bookings/booking123/complete

// System checks: Is paymentStatus === 'completed'?
// YES → Status: completed, Revenue updated
// NO → Error: "Payment not completed yet"
```

### Example 3: Revenue Tracking
```javascript
// Scenario: Employee completes 3 bookings in a day
Booking 1: ₹850 (Completed at 2:30 PM)
Booking 2: ₹1,200 (Completed at 4:15 PM)
Booking 3: ₹500 (Completed at 6:45 PM)

// Dashboard automatically updates:
Daily Revenue: ₹2,550
Weekly Revenue: Updates total
Monthly Revenue: Updates total
Total Revenue: Updates lifetime total
```

---

## 📞 14. SUPPORT & MAINTENANCE

### Common Issues

#### Issue: Employee cannot login
- **Solution**: Check if employee is verified in admin panel
- **Check**: Verify password reset if forgotten

#### Issue: Cannot mark booking as completed
- **Solution**: Check payment status
- **Check**: Verify booking is in "In Progress" status

#### Issue: Revenue not updating
- **Solution**: Verify booking status is "Completed"
- **Check**: Check payment verification

---

## 🎯 Summary

This Employee Profile & Dashboard System provides:
✅ Secure authentication
✅ Professional profile management
✅ Real-time analytics dashboard
✅ Comprehensive booking management
✅ Automatic revenue tracking
✅ Payment verification system
✅ Customer history tracking
✅ Real-time notifications
✅ Modern, responsive UI
✅ Scalable backend architecture

