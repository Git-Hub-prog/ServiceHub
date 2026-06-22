/* ============================================
   EMPLOYEE DASHBOARD - MODERN JAVASCRIPT
   Urban Company Inspired Theme
   ============================================ */

const API_BASE_URL = 'http://localhost:5000/api/employee';
const token = localStorage.getItem('employeeToken');

// ===========================================
// STATE MANAGEMENT
// ===========================================

let appState = {
    employee: null,
    stats: null,
    bookings: [],
    currentFilter: 'all',
    currentStatus: 'offline',
    shiftActive: false,
    shiftStartTime: null,
    earningsChart: null,
};

// ===========================================
// API HELPER FUNCTIONS
// ===========================================

async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ===========================================
// AUTHENTICATION GUARD
// ===========================================

function checkAuthentication() {
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ===========================================
// DATA LOADING FUNCTIONS
// ===========================================

async function loadProfile() {
    try {
        const data = await apiFetch('/profile');
        appState.employee = data.employee;
        updateProfileUI();
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Error loading profile', 'error');
    }
}

async function loadStats() {
    try {
        const data = await apiFetch('/dashboard-stats');
        appState.stats = data.stats;
        updateStatsUI();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadBookings(filter = 'all') {
    try {
        const endpoint = filter && filter !== 'all' ? `/bookings?status=${filter}` : '/bookings';
        const data = await apiFetch(endpoint);
        appState.bookings = data.bookings || [];
        renderBookings();
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

// ===========================================
// UI UPDATE FUNCTIONS
// ===========================================

function updateProfileUI() {
    const emp = appState.employee;
    if (!emp) return;

    // Update navbar menu
    document.getElementById('profileMenuName').textContent = emp.fullName || 'Professional';

    // Update welcome section
    document.getElementById('welcomeName').textContent = emp.fullName || 'Professional';
    document.getElementById('profileName').textContent = emp.fullName || '—';
    document.getElementById('profileId').textContent = `Employee ID: ${emp.employeeId || '—'}`;

    // Update profile card
    document.getElementById('profileService').textContent = emp.serviceCategory || '—';
    document.getElementById('profileExperience').textContent = `${emp.experience || 0} years`;
    document.getElementById('profileMobile').textContent = emp.phone || '—';
    document.getElementById('profileEmail').textContent = emp.email || '—';
    
    const location = [emp.location?.city, emp.location?.state].filter(Boolean).join(', ') || '—';
    document.getElementById('profileLocation').textContent = location;
    
    const joinedDate = emp.joinedDate 
        ? new Date(emp.joinedDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) 
        : '—';
    document.getElementById('profileJoined').textContent = joinedDate;

    // Update status badge
    const statusBadge = document.getElementById('statusBadge');
    const status = (emp.status || 'active').toLowerCase();
    statusBadge.textContent = status === 'active' ? 'Active' : status.toUpperCase();
    statusBadge.className = `profile-status-badge ${status === 'active' ? 'active' : 'offline'}`;
}

function updateStatsUI() {
    const stats = appState.stats;
    if (!stats) return;

    const fmtMoney = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
    const rating = Number(stats.avgRating || 0).toFixed(1);

    // Welcome stats
    document.getElementById('welcomeJobs').textContent = stats.totalJobsCompleted || 0;
    document.getElementById('welcomeRating').textContent = rating;
    document.getElementById('welcomeEarnings').textContent = fmtMoney(stats.weeklyRevenue);

    // Statistics cards
    document.getElementById('statTotalJobs').textContent = stats.totalJobsCompleted || 0;
    document.getElementById('statWeeklyRevenue').textContent = fmtMoney(stats.weeklyRevenue);
    document.getElementById('statAvgRating').textContent = rating;
    document.getElementById('statPendingJobs').textContent = stats.pendingJobs || 0;

    // Initialize earnings chart
    initEarningsChart(stats.weeklyRevenue);
}

function renderBookings() {
    const container = document.getElementById('bookingsTableBody');
    container.innerHTML = '';

    if (!appState.bookings || appState.bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; padding: 40px;">
                <span class="empty-icon">📭</span>
                <p>No bookings found</p>
            </div>
        `;
        return;
    }

    appState.bookings.forEach(booking => {
        const statusClass = `badge-${booking.status}`;
        const fmtMoney = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
        const fmtDate = (date) => {
            const d = new Date(date);
            return d.toLocaleString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        };

        const card = document.createElement('div');
        card.className = 'booking-card';
        card.innerHTML = `
            <div class="booking-row-main">
                <div class="booking-info">
                    <div class="booking-detail">
                        <div class="booking-detail-label">ID</div>
                        <div class="booking-detail-value">${booking._id?.substring(0, 8) || '—'}</div>
                    </div>
                    <div class="booking-detail">
                        <div class="booking-detail-label">Customer</div>
                        <div class="booking-detail-value">${booking.customerName || '—'}</div>
                    </div>
                    <div class="booking-detail">
                        <div class="booking-detail-label">Service</div>
                        <div class="booking-detail-value">${booking.serviceName || '—'}</div>
                    </div>
                    <div class="booking-detail">
                        <div class="booking-detail-label">Time</div>
                        <div class="booking-detail-value">${fmtDate(booking.bookingDate || booking.createdAt)}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <span class="badge ${statusClass}">${booking.status}</span>
                    <div class="action-group">
                        ${getBookingActions(booking)}
                    </div>
                </div>
            </div>
            <div class="booking-details-expanded">
                <div class="detail-item">
                    <div class="detail-label">📞 Phone</div>
                    <div class="detail-value">${booking.customerPhone || '—'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">📍 Address</div>
                    <div class="detail-value">${booking.address || '—'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">💰 Amount</div>
                    <div class="detail-value">${fmtMoney(booking.price || 0)}</div>
                </div>
                <div class="detail-item" style="grid-column: 1 / -1;">
                    <div class="detail-label">📋 Details</div>
                    <div class="detail-value">${booking.description || 'No additional details'}</div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function getBookingActions(booking) {
    const status = booking.status?.toLowerCase();
    
    if (status === 'pending') {
        return `<button class="btn btn-primary" onclick="acceptBooking('${booking._id}')">Accept</button>`;
    } else if (status === 'accepted' || status === 'arrived') {
        return `<button class="btn btn-primary" onclick="startWork('${booking._id}')">Start Work</button>`;
    } else if (status === 'inprogress') {
        return `<button class="btn btn-primary" onclick="completeBooking('${booking._id}')">Complete</button>`;
    }
    return '';
}

function initEarningsChart(weeklyRevenue) {
    const ctx = document.getElementById('earningsChart');
    if (!ctx) return;

    if (appState.earningsChart) {
        appState.earningsChart.destroy();
    }

    const avg = weeklyRevenue / 7;
    const data = [0.55, 0.70, 0.85, 0.95, 1.05, 1.18, 1.32].map(f => Math.round(avg * f));

    appState.earningsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Earnings (₹)',
                data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.42,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: true, labels: { color: '#1e293b' } },
                tooltip: {
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    titleColor: '#1e293b',
                    bodyColor: '#64748b',
                    callbacks: { 
                        label: (ctx) => ` ₹${Number(ctx.raw).toLocaleString('en-IN')}` 
                    }
                }
            },
            scales: {
                x: { 
                    grid: { color: 'rgba(226, 232, 240, 0.3)' },
                    ticks: { color: '#94a3b8', font: { size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(226, 232, 240, 0.3)' },
                    ticks: { 
                        color: '#94a3b8',
                        font: { size: 11 },
                        callback: (v) => `₹${Number(v).toLocaleString('en-IN')}`
                    }
                }
            }
        }
    });
}

// ===========================================
// WORK STATUS & SHIFT MANAGEMENT
// ===========================================

function setWorkStatus(status) {
    appState.currentStatus = status;
    document.getElementById('currentStatusBadge').textContent = status.toUpperCase();

    // Update button states
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.status === status) {
            btn.classList.add('active');
        }
    });

    localStorage.setItem('employeeStatus', status);
}

function startShift() {
    appState.shiftActive = true;
    appState.shiftStartTime = new Date();
    
    document.getElementById('startShiftBtn').disabled = true;
    document.getElementById('endShiftBtn').disabled = false;
    document.getElementById('shiftStartTime').textContent = appState.shiftStartTime.toLocaleTimeString('en-IN');
    
    localStorage.setItem('shiftActive', 'true');
    localStorage.setItem('shiftStartTime', appState.shiftStartTime.toISOString());
    
    updateShiftDisplay();
}

function endShift() {
    appState.shiftActive = false;
    document.getElementById('startShiftBtn').disabled = false;
    document.getElementById('endShiftBtn').disabled = true;
    document.getElementById('shiftStartTime').textContent = '—';
    document.getElementById('hoursWorked').textContent = '0h 0m';
    
    localStorage.removeItem('shiftActive');
    localStorage.removeItem('shiftStartTime');
}

function updateShiftDisplay() {
    if (appState.shiftActive && appState.shiftStartTime) {
        const now = new Date();
        const diff = now - appState.shiftStartTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById('hoursWorked').textContent = `${hours}h ${minutes}m`;
    }
}

// ===========================================
// BOOKING ACTIONS
// ===========================================

async function acceptBooking(bookingId) {
    try {
        await apiFetch(`/bookings/${bookingId}/accept`, { method: 'POST' });
        showNotification('Booking accepted successfully!', 'success');
        await loadBookings(appState.currentFilter);
    } catch (error) {
        showNotification(error.message || 'Failed to accept booking', 'error');
    }
}

async function startWork(bookingId) {
    try {
        await apiFetch(`/bookings/${bookingId}/start`, { method: 'POST' });
        showNotification('Work started!', 'success');
        await loadBookings(appState.currentFilter);
    } catch (error) {
        showNotification(error.message || 'Failed to start work', 'error');
    }
}

async function completeBooking(bookingId) {
    try {
        await apiFetch(`/bookings/${bookingId}/complete`, { method: 'POST' });
        showNotification('Booking completed!', 'success');
        await loadBookings(appState.currentFilter);
    } catch (error) {
        showNotification(error.message || 'Failed to complete booking', 'error');
    }
}

// ===========================================
// EDIT PROFILE
// ===========================================

function openEditProfile() {
    const emp = appState.employee;
    if (!emp) return;

    document.getElementById('editFullName').value = emp.fullName || '';
    document.getElementById('editPhone').value = emp.phone || '';
    document.getElementById('editEmail').value = emp.email || '';
    document.getElementById('editExperience').value = emp.experience || 0;
    document.getElementById('editCity').value = emp.location?.city || '';
    document.getElementById('editState').value = emp.location?.state || '';
    document.getElementById('editPincode').value = emp.location?.pincode || '';
    document.getElementById('editService').value = emp.serviceCategory || '';

    document.getElementById('editProfileModal').classList.add('show');
}

function closeEditProfile() {
    document.getElementById('editProfileModal').classList.remove('show');
}

async function saveProfile(e) {
    e.preventDefault();

    const fullName = document.getElementById('editFullName').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const experience = Number(document.getElementById('editExperience').value || 0);
    const city = document.getElementById('editCity').value.trim();
    const state = document.getElementById('editState').value.trim();
    const pincode = document.getElementById('editPincode').value.trim();

    try {
        await apiFetch('/profile', {
            method: 'PUT',
            body: JSON.stringify({
                fullName,
                phone,
                experience,
                location: { city, state, pincode }
            })
        });

        showNotification('Profile updated successfully!', 'success');
        await loadProfile();
        closeEditProfile();
    } catch (error) {
        showNotification(error.message || 'Failed to update profile', 'error');
    }
}

// ===========================================
// NOTIFICATION SYSTEM
// ===========================================

function showNotification(message, type = 'info') {
    // Create a simple toast notification
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#06b6d4'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideInUp 0.3s ease-out;
        font-weight: 600;
    `;
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.remove();
    }, 3000);
}

// ===========================================
// EVENT LISTENERS
// ===========================================

function setupEventListeners() {
    // Work status buttons
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setWorkStatus(btn.dataset.status);
        });
    });

    // Shift controls
    document.getElementById('startShiftBtn').addEventListener('click', startShift);
    document.getElementById('endShiftBtn').addEventListener('click', endShift);

    // Profile menu
    document.getElementById('profileMenuBtn').addEventListener('click', () => {
        document.getElementById('profileMenu').classList.toggle('show');
    });

    document.getElementById('editProfileBtn').addEventListener('click', () => {
        openEditProfile();
        document.getElementById('profileMenu').classList.remove('show');
    });

    document.getElementById('editProfileMainBtn').addEventListener('click', openEditProfile);

    // Edit profile modal
    document.getElementById('closeEditModalBtn').addEventListener('click', closeEditProfile);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditProfile);
    document.getElementById('editProfileForm').addEventListener('submit', saveProfile);

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.currentFilter = btn.dataset.filter;
            await loadBookings(appState.currentFilter);
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('logoutMenuBtn').addEventListener('click', logout);

    // Close modals on overlay click
    document.getElementById('editProfileModal').addEventListener('click', (e) => {
        if (e.target.id === 'editProfileModal') closeEditProfile();
    });

    // Close profile menu on click outside
    document.addEventListener('click', (e) => {
        const profileMenu = document.getElementById('profileMenu');
        const profileBtn = document.getElementById('profileMenuBtn');
        if (!profileMenu.contains(e.target) && !profileBtn.contains(e.target)) {
            profileMenu.classList.remove('show');
        }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEditProfile();
            document.getElementById('profileMenu').classList.remove('show');
        }
    });
}

// ===========================================
// LOGOUT
// ===========================================

function logout() {
    localStorage.removeItem('employeeToken');
    localStorage.removeItem('employeeId');
    window.location.href = 'login.html';
}

// ===========================================
// INITIALIZATION
// ===========================================

async function initialize() {
    if (!checkAuthentication()) return;

    try {
        // Load initial data
        await Promise.all([
            loadProfile(),
            loadStats(),
            loadBookings('all')
        ]);

        // Setup event listeners
        setupEventListeners();

        // Restore shift state if active
        const shiftActive = localStorage.getItem('shiftActive');
        const shiftStartTime = localStorage.getItem('shiftStartTime');
        if (shiftActive === 'true' && shiftStartTime) {
            appState.shiftActive = true;
            appState.shiftStartTime = new Date(shiftStartTime);
            document.getElementById('startShiftBtn').disabled = true;
            document.getElementById('endShiftBtn').disabled = false;
            document.getElementById('shiftStartTime').textContent = appState.shiftStartTime.toLocaleTimeString('en-IN');
            updateShiftDisplay();
        }

        // Restore work status
        const savedStatus = localStorage.getItem('employeeStatus');
        if (savedStatus) {
            setWorkStatus(savedStatus);
        }

        // Update shift display every minute
        setInterval(updateShiftDisplay, 60000);

        // Refresh data every 5 minutes
        setInterval(() => {
            loadStats();
            loadBookings(appState.currentFilter);
        }, 5 * 60 * 1000);

    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Error loading dashboard', 'error');
    }
}

// ===========================================
// START APPLICATION
// ===========================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
