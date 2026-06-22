(function () {
  const API_BASE = "http://localhost:5000/api";
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Secure admin-only client check
  if (!user || !user.token || user.role !== "admin") {
    alert("Unauthorized. Please log in as an administrator.");
    window.location.href = "/frontend/profile/login.html";
    return;
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${user.token}`
  };

  // Welcome banner setup
  const welcomeText = document.getElementById("adminWelcome");
  if (welcomeText) {
    welcomeText.textContent = `Welcome back, ${user.name || 'Admin'} (${user.email})`;
  }

  // Active view state
  const ACTIVE_VIEW_KEY = "adminActiveView";
  let currentView = localStorage.getItem(ACTIVE_VIEW_KEY) || "overview";

  // Pagination states
  const paginationState = {
    users: { page: 1, limit: 15, total: 0 },
    employees: { page: 1, limit: 15, total: 0 }
  };

  // Chart instances
  let revenueTrendChart = null;
  let bookingBreakdownChart = null;
  let analyticsDataCache = null;

  // Utility elements
  const apiNote = document.getElementById("apiNote");

  function showNotification(msg, isError = true) {
    if (!apiNote) return;
    apiNote.style.display = "block";
    apiNote.style.background = isError ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)";
    apiNote.style.borderColor = isError ? "var(--red)" : "var(--green)";
    apiNote.style.color = isError ? "var(--red)" : "var(--green)";
    apiNote.textContent = msg;
    setTimeout(() => {
      apiNote.style.display = "none";
    }, 6000);
  }

  // Helper fetch handler
  async function fetchAPI(endpoint, options = {}) {
    try {
      const resp = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          ...authHeaders,
          ...options.headers
        }
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.message || `API request failed with status ${resp.status}`);
      }
      return data;
    } catch (err) {
      showNotification(err.message);
      throw err;
    }
  }

  // Navigation
  function showView(view) {
    currentView = view;
    localStorage.setItem(ACTIVE_VIEW_KEY, view);

    document.querySelectorAll(".view").forEach((el) => el.classList.add("hidden"));
    const activeEl = document.getElementById(`view-${view}`);
    if (activeEl) activeEl.classList.remove("hidden");

    document.querySelectorAll(".menu button").forEach((b) => b.classList.remove("active"));
    const activeBtn = document.querySelector(`.menu button[data-view='${view}']`);
    if (activeBtn) activeBtn.classList.add("active");

    // Load data for active view
    switch (view) {
      case "overview":
        loadOverviewData();
        break;
      case "users":
        loadUsersData();
        break;
      case "employees":
        loadEmployeesData();
        break;
      case "partners":
        loadPartnerRequests();
        break;
      case "status":
        loadLiveStatus();
        break;
      case "analytics":
        loadAnalyticsData();
        break;
    }
  }

  // Status badges helper
  function getStatusTag(status) {
    const s = String(status || "").toLowerCase().trim();
    if (["approved", "completed", "paid", "available", "active"].includes(s)) {
      return `<span class="tag ok">${status}</span>`;
    }
    if (["pending", "searching", "busy", "on break"].includes(s)) {
      return `<span class="tag warn">${status}</span>`;
    }
    if (["rejected", "cancelled", "failed", "offline", "on-leave"].includes(s)) {
      return `<span class="tag bad">${status}</span>`;
    }
    return `<span class="tag info">${status || "-"}</span>`;
  }

  // Date formatter helper
  function formatDate(d) {
    if (!d) return "-";
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  // ==========================================
  // VIEW 1: OVERVIEW DASHBOARD
  // ==========================================
  async function loadOverviewData() {
    try {
      const res = await fetchAPI("/admin/dashboard");
      if (res.success && res.data) {
        const d = res.data;
        document.getElementById("statUsers").textContent = d.users || 0;
        document.getElementById("statEmployees").textContent = d.totalEmployees || d.partners || 0;
        document.getElementById("statBookings").textContent = d.totalBookings || 0;
        document.getElementById("statActiveJobs").textContent = d.activeJobs || 0;
        document.getElementById("statRevenue").textContent = `₹${Number(d.totalRevenue || 0).toLocaleString("en-IN")}`;

        // Top banner summary
        document.getElementById("bannerRevenue").textContent = `₹${Number(d.totalRevenue || 0).toLocaleString("en-IN")}`;
        document.getElementById("bannerBookings").textContent = d.totalBookings || 0;
      }
    } catch (err) {
      console.error("Failed to load overview data:", err);
    }
  }

  // ==========================================
  // VIEW 2: USER MANAGEMENT
  // ==========================================
  window.loadUsersData = async function () {
    try {
      const search = document.getElementById("userSearchInput").value.trim();
      const role = document.getElementById("userRoleFilter").value;
      const { page, limit } = paginationState.users;

      let query = `?page=${page}&limit=${limit}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (role) query += `&role=${encodeURIComponent(role)}`;

      const res = await fetchAPI(`/admin/users${query}`);
      if (res.success && res.data) {
        paginationState.users.total = res.total;
        renderUsersTable(res.data);
        updateUsersPagination();
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  function renderUsersTable(usersList) {
    const tbody = document.getElementById("usersTableBody");
    if (!usersList.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-row" style="text-align: center; padding: 24px; color: var(--text-2);">No users registered.</td></tr>`;
      return;
    }

    tbody.innerHTML = usersList.map(u => `
      <tr style="cursor: pointer;" onclick="viewUserDetails('${u._id}')">
        <td style="font-weight: 600; color: var(--text-1);">${u.name}</td>
        <td>${u.email}</td>
        <td>${getStatusTag(u.role)}</td>
        <td style="text-align: right;" onclick="event.stopPropagation();">
          <button class="btn primary" onclick="openEditUserModal('${u._id}', '${u.name}', '${u.email}', '${u.role}')" title="Edit User">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn bad" onclick="deleteUserRecord('${u._id}')" title="Delete User">
            <i class="fas fa-trash-alt"></i>
          </button>
          <button class="btn alt" onclick="viewUserDetails('${u._id}')" title="View Booking History">
            <i class="fas fa-history"></i>
          </button>
        </td>
      </tr>
    `).join("");
  }

  function updateUsersPagination() {
    const { page, limit, total } = paginationState.users;
    const totalPages = Math.ceil(total / limit) || 1;
    document.getElementById("usersPaginationInfo").textContent = `Page ${page} of ${totalPages} (Total: ${total})`;
    document.getElementById("usersPrevBtn").disabled = page <= 1;
    document.getElementById("usersNextBtn").disabled = page >= totalPages;
  }

  // Modals Add/Edit Users
  window.openAddUserModal = function () {
    document.getElementById("userModalTitle").innerHTML = `<i class="fas fa-user-plus"></i> Add New User`;
    document.getElementById("userFormId").value = "";
    document.getElementById("userFormName").value = "";
    document.getElementById("userFormEmail").value = "";
    document.getElementById("userFormPassword").value = "";
    document.getElementById("userFormPasswordGroup").style.display = "block";
    document.getElementById("userFormRole").value = "user";
    document.getElementById("userModal").classList.add("show");
  };

  window.openEditUserModal = function (id, name, email, role) {
    document.getElementById("userModalTitle").innerHTML = `<i class="fas fa-user-edit"></i> Edit User Account`;
    document.getElementById("userFormId").value = id;
    document.getElementById("userFormName").value = name;
    document.getElementById("userFormEmail").value = email;
    document.getElementById("userFormPassword").value = "";
    document.getElementById("userFormPasswordGroup").style.display = "none"; // Hide password for edits
    document.getElementById("userFormRole").value = role;
    document.getElementById("userModal").classList.add("show");
  };

  window.closeUserModal = function () {
    document.getElementById("userModal").classList.remove("show");
  };

  window.submitUserForm = async function () {
    const id = document.getElementById("userFormId").value;
    const name = document.getElementById("userFormName").value.trim();
    const email = document.getElementById("userFormEmail").value.trim();
    const password = document.getElementById("userFormPassword").value.trim();
    const role = document.getElementById("userFormRole").value;

    if (!name || !email) {
      alert("Name and email are required fields.");
      return;
    }

    try {
      let res;
      if (id) {
        // Edit User
        res = await fetchAPI(`/admin/users/${id}`, {
          method: "PUT",
          body: JSON.stringify({ name, email, role })
        });
      } else {
        // Add User
        if (!password || password.length < 6) {
          alert("Password is required and must be at least 6 characters.");
          return;
        }
        res = await fetchAPI("/admin/users", {
          method: "POST",
          body: JSON.stringify({ name, email, password, role })
        });
      }

      if (res.success) {
        showNotification(id ? "User profile updated successfully." : "User registered successfully.", false);
        closeUserModal();
        loadUsersData();
        loadOverviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  window.deleteUserRecord = async function (id) {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      const res = await fetchAPI(`/admin/users/${id}`, {
        method: "DELETE"
      });
      if (res.success) {
        showNotification("User deleted successfully.", false);
        loadUsersData();
        loadOverviewData();
      }
    } catch (err) {
      console.error("Delete user error:", err);
    }
  };

  // User Details & Booking History
  window.viewUserDetails = async function (id) {
    try {
      const res = await fetchAPI(`/admin/users/${id}/details`);
      if (res.success && res.data) {
        const { user, bookings } = res.data;
        document.getElementById("userDetailName").textContent = user.name;
        document.getElementById("userDetailEmail").textContent = user.email;
        document.getElementById("userDetailRole").innerHTML = getStatusTag(user.role);
        document.getElementById("userDetailCreated").textContent = formatDate(user.createdAt);

        renderUserBookingsList(bookings);
        document.getElementById("userDetailsModal").classList.add("show");
      }
    } catch (err) {
      console.error("User details view error:", err);
    }
  };

  window.closeUserDetailsModal = function () {
    document.getElementById("userDetailsModal").classList.remove("show");
  };

  function renderUserBookingsList(bookings) {
    const tbody = document.getElementById("userDetailBookingsBody");
    if (!bookings.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-row" style="text-align: center; padding: 24px; color: var(--text-2);">No booking history found.</td></tr>`;
      return;
    }

    tbody.innerHTML = bookings.map(b => {
      const employee = b.agent && b.agent.fullName ? b.agent.fullName : "-";
      const shiftVal = b.shift ? `${b.shift} (${b.startTime || ''})` : formatDate(b.bookingDate);
      
      let overrideDetailHtml = "";
      if (b.paymentOverrideReason) {
        overrideDetailHtml = `<div class="override-history">⚠️ Overridden by ${b.paymentOverrideBy || 'Admin'}: <i>"${b.paymentOverrideReason}"</i></div>`;
      }

      return `
        <tr>
          <td style="font-weight: 600; color: var(--text-1);">${b.serviceName}</td>
          <td>${shiftVal}</td>
          <td><span title="${b.address}">${b.address.length > 25 ? b.address.slice(0, 22) + '...' : b.address}</span></td>
          <td>${employee}</td>
          <td style="font-family: var(--font-display); font-weight: 700; color: var(--teal);">₹${b.price}</td>
          <td>${getStatusTag(b.status)}</td>
          <td>
            ${getStatusTag(b.paymentStatus)}
            ${overrideDetailHtml}
          </td>
          <td style="text-align: right;">
            <button class="btn alt" onclick="openOverrideModal('${b._id}', '${b.paymentStatus}')" title="Override Payment Status">
              <i class="fas fa-edit"></i> Override
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  // Payment Status Override Modal triggers
  window.openOverrideModal = function (bookingId, currentStatus) {
    document.getElementById("overrideBookingId").value = bookingId;
    document.getElementById("overridePaymentStatus").value = currentStatus;
    document.getElementById("overrideReason").value = "";
    document.getElementById("overridePaymentModal").classList.add("show");
  };

  window.closeOverrideModal = function () {
    document.getElementById("overridePaymentModal").classList.remove("show");
  };

  window.submitPaymentOverride = async function () {
    const bookingId = document.getElementById("overrideBookingId").value;
    const paymentStatus = document.getElementById("overridePaymentStatus").value;
    const paymentOverrideReason = document.getElementById("overrideReason").value.trim();

    if (!paymentOverrideReason) {
      alert("Please provide a reason for manual payment override.");
      return;
    }

    try {
      const res = await fetchAPI(`/admin/bookings/${bookingId}`, {
        method: "PUT",
        body: JSON.stringify({ paymentStatus, paymentOverrideReason })
      });
      if (res.success) {
        showNotification("Payment status overridden successfully.", false);
        closeOverrideModal();
        
        // Refresh User Details Modal history
        const activeUserId = res.data.user;
        if (activeUserId) {
          viewUserDetails(activeUserId);
        } else {
          closeUserDetailsModal();
        }
        loadOverviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // VIEW 3: EMPLOYEE MANAGEMENT
  // ==========================================
  window.loadEmployeesData = async function () {
    try {
      const search = document.getElementById("employeeSearchInput").value.trim();
      const serviceCategory = document.getElementById("employeeCategoryFilter").value;
      const { page, limit } = paginationState.employees;

      let query = `?page=${page}&limit=${limit}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (serviceCategory) query += `&serviceCategory=${encodeURIComponent(serviceCategory)}`;

      const res = await fetchAPI(`/admin/employees${query}`);
      if (res.success && res.data) {
        paginationState.employees.total = res.total;
        renderEmployeesTable(res.data);
        updateEmployeesPagination();
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  };

  function renderEmployeesTable(employeeList) {
    const tbody = document.getElementById("employeesTableBody");
    if (!employeeList.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row" style="text-align: center; padding: 24px; color: var(--text-2);">No employees found.</td></tr>`;
      return;
    }

    tbody.innerHTML = employeeList.map(e => `
      <tr style="cursor: pointer;" onclick="viewEmployeeProfile('${e._id}')">
        <td style="font-family: var(--font-display); font-weight: 700; color: var(--teal);">${e.employeeId}</td>
        <td style="font-weight: 600; color: var(--text-1);">${e.fullName}</td>
        <td style="text-transform: capitalize;">${e.serviceCategory}</td>
        <td>${e.experience} Years</td>
        <td style="color: var(--gold); font-weight: bold;">★ ${e.rating || 0}</td>
        <td>${getStatusTag(e.status)}</td>
        <td style="text-align: right;" onclick="event.stopPropagation();">
          <button class="btn primary" onclick="openEditEmployeeModal('${e._id}', '${e.fullName}', '${e.email}', '${e.phone}', '${e.serviceCategory}', ${e.experience}, '${e.status}')" title="Edit Employee">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn bad" onclick="deleteEmployeeRecord('${e._id}')" title="Delete Employee">
            <i class="fas fa-trash-alt"></i>
          </button>
          <button class="btn alt" onclick="viewEmployeeProfile('${e._id}')" title="View Profile details">
            <i class="fas fa-user-circle"></i>
          </button>
        </td>
      </tr>
    `).join("");
  }

  function updateEmployeesPagination() {
    const { page, limit, total } = paginationState.employees;
    const totalPages = Math.ceil(total / limit) || 1;
    document.getElementById("employeesPaginationInfo").textContent = `Page ${page} of ${totalPages} (Total: ${total})`;
    document.getElementById("employeesPrevBtn").disabled = page <= 1;
    document.getElementById("employeesNextBtn").disabled = page >= totalPages;
  }

  window.openAddEmployeeModal = function () {
    document.getElementById("employeeModalTitle").innerHTML = `<i class="fas fa-user-plus"></i> Add New Employee`;
    document.getElementById("employeeFormId").value = "";
    document.getElementById("employeeFormName").value = "";
    document.getElementById("employeeFormEmail").value = "";
    document.getElementById("employeeFormPhone").value = "";
    document.getElementById("employeeFormPassword").value = "";
    document.getElementById("employeeFormPasswordGroup").style.display = "block";
    document.getElementById("employeeFormCategory").value = "plumber";
    document.getElementById("employeeFormExperience").value = "0";
    document.getElementById("employeeFormStatus").value = "active";
    document.getElementById("employeeModal").classList.add("show");
  };

  window.openEditEmployeeModal = function (id, name, email, phone, category, experience, status) {
    document.getElementById("employeeModalTitle").innerHTML = `<i class="fas fa-user-edit"></i> Edit Employee Profile`;
    document.getElementById("employeeFormId").value = id;
    document.getElementById("employeeFormName").value = name;
    document.getElementById("employeeFormEmail").value = email;
    document.getElementById("employeeFormPhone").value = phone;
    document.getElementById("employeeFormPassword").value = "";
    document.getElementById("employeeFormPasswordGroup").style.display = "none";
    document.getElementById("employeeFormCategory").value = category;
    document.getElementById("employeeFormExperience").value = experience;
    document.getElementById("employeeFormStatus").value = status;
    document.getElementById("employeeModal").classList.add("show");
  };

  window.closeEmployeeModal = function () {
    document.getElementById("employeeModal").classList.remove("show");
  };

  window.submitEmployeeForm = async function () {
    const id = document.getElementById("employeeFormId").value;
    const fullName = document.getElementById("employeeFormName").value.trim();
    const email = document.getElementById("employeeFormEmail").value.trim();
    const phone = document.getElementById("employeeFormPhone").value.trim();
    const password = document.getElementById("employeeFormPassword").value.trim();
    const serviceCategory = document.getElementById("employeeFormCategory").value;
    const experience = parseInt(document.getElementById("employeeFormExperience").value) || 0;
    const status = document.getElementById("employeeFormStatus").value;

    if (!fullName || !email || !phone || !serviceCategory) {
      alert("Name, email, phone, and service category are required.");
      return;
    }

    try {
      let res;
      if (id) {
        res = await fetchAPI(`/admin/employees/${id}`, {
          method: "PUT",
          body: JSON.stringify({ fullName, email, phone, serviceCategory, experience, status })
        });
      } else {
        if (!password || password.length < 6) {
          alert("Password is required and must be at least 6 characters.");
          return;
        }
        res = await fetchAPI("/admin/employees", {
          method: "POST",
          body: JSON.stringify({ fullName, email, phone, password, serviceCategory, experience, status })
        });
      }

      if (res.success) {
        showNotification(id ? "Employee profile updated successfully." : "Employee profile created successfully.", false);
        closeEmployeeModal();
        loadEmployeesData();
        loadOverviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  window.deleteEmployeeRecord = async function (id) {
    if (!confirm("Are you sure you want to delete this employee? This will also remove their associated partner account.")) return;
    try {
      const res = await fetchAPI(`/admin/employees/${id}`, {
        method: "DELETE"
      });
      if (res.success) {
        showNotification("Employee deleted successfully.", false);
        loadEmployeesData();
        loadOverviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Employee details and job history
  window.viewEmployeeProfile = async function (id) {
    try {
      const res = await fetchAPI(`/admin/employees/${id}`);
      if (res.success && res.data) {
        const { employee, bookings } = res.data;
        document.getElementById("empDetailId").textContent = employee.employeeId;
        document.getElementById("empDetailName").textContent = employee.fullName;
        document.getElementById("empDetailEmail").textContent = employee.email;
        document.getElementById("empDetailPhone").textContent = employee.phone;
        document.getElementById("empDetailCategory").textContent = employee.serviceCategory;
        document.getElementById("empDetailExperience").textContent = `${employee.experience} Years`;
        document.getElementById("empDetailRating").innerHTML = `<span style="color:var(--gold)">★</span> ${employee.rating || 0} (${employee.reviewCount || 0} reviews)`;
        document.getElementById("empDetailJobs").textContent = employee.totalJobsCompleted || 0;

        renderEmployeeJobsList(bookings);
        document.getElementById("employeeDetailsModal").classList.add("show");
      }
    } catch (err) {
      console.error("Employee profile error:", err);
    }
  };

  window.closeEmployeeDetailsModal = function () {
    document.getElementById("employeeDetailsModal").classList.remove("show");
  };

  function renderEmployeeJobsList(bookings) {
    const tbody = document.getElementById("empDetailJobsBody");
    if (!bookings.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-row" style="text-align: center; padding: 24px; color: var(--text-2);">No jobs handled yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td style="font-family: var(--font-display); font-weight: 700; color: var(--teal);">${b._id.slice(-8).toUpperCase()}</td>
        <td style="font-weight: 600;">${b.customerName}</td>
        <td>${formatDate(b.bookingDate)}</td>
        <td><span title="${b.address}">${b.address.length > 30 ? b.address.slice(0, 27) + '...' : b.address}</span></td>
        <td style="font-family: var(--font-display); font-weight: 700; color: var(--teal);">₹${b.price}</td>
        <td>${getStatusTag(b.status)}</td>
      </tr>
    `).join("");
  }

  // ==========================================
  // VIEW 4: PARTNER REGISTRATION REQUESTS
  // ==========================================
  window.loadPartnerRequests = async function () {
    try {
      const approvalStatus = document.getElementById("partnerStatusFilter").value;
      const q = approvalStatus ? `?approvalStatus=${approvalStatus}` : "";
      
      const res = await fetchAPI(`/admin/partners${q}`);
      if (res.success && res.data) {
        renderPartnersTable(res.data);
      }
    } catch (err) {
      console.error("Failed to load partner requests:", err);
    }
  };

  function renderPartnersTable(partners) {
    const tbody = document.getElementById("partnersTableBody");
    if (!partners.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-row" style="text-align: center; padding: 24px; color: var(--text-2);">No partner registration requests.</td></tr>`;
      return;
    }

    tbody.innerHTML = partners.map(p => {
      const shiftName = p.preferredShift === "morning" 
        ? "Morning Shift" 
        : p.preferredShift === "afternoon" 
          ? "Afternoon Shift" 
          : "Both Shifts";

      return `
        <tr style="cursor: pointer;" onclick="viewPartnerApplication('${p._id}')">
          <td style="font-weight: 600; color: var(--text-1);">${p.name}</td>
          <td>${p.email}</td>
          <td>${p.phone}</td>
          <td style="text-transform: capitalize;">${p.service}</td>
          <td>${shiftName}</td>
          <td>${p.experience} Years</td>
          <td>${getStatusTag(p.approvalStatus)}</td>
          <td style="text-align: right;" onclick="event.stopPropagation();">
            ${p.approvalStatus === 'pending' ? `
              <button class="btn primary" onclick="approvePartnerRequest('${p._id}')" title="Approve Application">Approve</button>
              <button class="btn bad" onclick="rejectPartnerRequest('${p._id}')" title="Reject Application">Reject</button>
            ` : `-`}
            <button class="btn alt" onclick="viewPartnerApplication('${p._id}')" title="View Application Form">
              <i class="fas fa-file-alt"></i> Details
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  window.viewPartnerApplication = async function (id) {
    try {
      const res = await fetchAPI(`/admin/partners?limit=1`);
      // Since there is no single GET /api/admin/partners/:id endpoint, we find it in our cache/list or reload
      const resFull = await fetchAPI(`/admin/partners`);
      const partner = resFull.data.find(p => p._id === id);
      if (partner) {
        document.getElementById("partnerDetailName").textContent = partner.name;
        document.getElementById("partnerDetailEmail").textContent = partner.email;
        document.getElementById("partnerDetailPhone").textContent = partner.phone;
        document.getElementById("partnerDetailCategory").textContent = partner.service;
        
        const shiftName = partner.preferredShift === "morning" 
          ? "Morning Shift (6 AM - 12 PM)" 
          : partner.preferredShift === "afternoon" 
            ? "Afternoon Shift (2 PM - 6 PM)" 
            : "Both Shifts (Morning & Afternoon)";
        document.getElementById("partnerDetailShift").textContent = shiftName;
        document.getElementById("partnerDetailExperience").textContent = `${partner.experience} Years`;
        document.getElementById("partnerDetailAddress").textContent = partner.address;
        document.getElementById("partnerDetailDate").textContent = formatDate(partner.createdAt);
        document.getElementById("partnerDetailStatus").innerHTML = getStatusTag(partner.approvalStatus);

        document.getElementById("credentialsNotice").style.display = "none";

        // Setup footer actions
        const footer = document.getElementById("partnerDetailsFooter");
        if (partner.approvalStatus === 'pending') {
          footer.innerHTML = `
            <button class="btn" onclick="closePartnerDetailsModal()">Close</button>
            <button class="btn bad" onclick="rejectPartnerRequest('${partner._id}')">Reject Request</button>
            <button class="btn primary" onclick="approvePartnerRequest('${partner._id}')">Approve Application</button>
          `;
        } else {
          footer.innerHTML = `
            <button class="btn" onclick="closePartnerDetailsModal()">Close</button>
          `;
        }

        document.getElementById("partnerDetailsModal").classList.add("show");
      }
    } catch (err) {
      console.error(err);
    }
  };

  window.closePartnerDetailsModal = function () {
    document.getElementById("partnerDetailsModal").classList.remove("show");
  };

  window.approvePartnerRequest = async function (id) {
    try {
      const res = await fetchAPI(`/admin/partners/${id}/approval`, {
        method: "PUT",
        body: JSON.stringify({ approvalStatus: "approved" })
      });
      if (res.success) {
        showNotification("Application approved. Employee account auto-created.", false);
        
        // Populate and show login credentials block inside details modal
        if (res.credentials) {
          document.getElementById("credEmpId").textContent = res.credentials.employeeId;
          document.getElementById("credEmail").textContent = res.credentials.email;
          document.getElementById("credentialsNotice").style.display = "block";
          
          // Disable approve/reject buttons
          const footer = document.getElementById("partnerDetailsFooter");
          if (footer) {
            footer.innerHTML = `<button class="btn" onclick="closePartnerDetailsModal()">Close</button>`;
          }
        } else {
          closePartnerDetailsModal();
        }

        loadPartnerRequests();
        loadOverviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  window.rejectPartnerRequest = async function (id) {
    if (!confirm("Are you sure you want to reject this applicant?")) return;
    try {
      const res = await fetchAPI(`/admin/partners/${id}/approval`, {
        method: "PUT",
        body: JSON.stringify({ approvalStatus: "rejected" })
      });
      if (res.success) {
        showNotification("Application rejected.", false);
        closePartnerDetailsModal();
        loadPartnerRequests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // VIEW 5: EMPLOYEE STATUS MONITORING
  // ==========================================
  window.loadLiveStatus = async function () {
    try {
      const res = await fetchAPI("/admin/employees/status");
      if (res.success && res.data) {
        renderLiveStatusTable(res.data);
      }
    } catch (err) {
      console.error("Failed to load worker status:", err);
    }
  };

  function renderLiveStatusTable(statusList) {
    const tbody = document.getElementById("liveStatusTableBody");
    if (!statusList.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row" style="text-align: center; padding: 24px; color: var(--text-2);">No workers online.</td></tr>`;
      return;
    }

    tbody.innerHTML = statusList.map(s => {
      let liveBadge = `<span class="tag info">${s.status}</span>`;
      if (s.status === "Available") {
        liveBadge = `<span class="tag ok" style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3);"><i class="fas fa-circle" style="font-size:8px; margin-right:5px; animation:blink 1.8s infinite;"></i>Available</span>`;
      } else if (s.status === "Busy") {
        liveBadge = `<span class="tag warn"><i class="fas fa-spinner fa-spin" style="font-size:10px; margin-right:5px;"></i>Busy (Job)</span>`;
      } else if (s.status === "On Break") {
        liveBadge = `<span class="tag warn" style="background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3);">On Break</span>`;
      } else if (s.status === "Offline") {
        liveBadge = `<span class="tag bad">Offline</span>`;
      }

      const shiftDisplay = s.shift === "morning" 
        ? "Morning Shift" 
        : s.shift === "afternoon" 
          ? "Afternoon Shift" 
          : s.shift;

      return `
        <tr>
          <td style="font-family: var(--font-display); font-weight: 700; color: var(--teal);">${s.employeeId}</td>
          <td style="font-weight: 600; color: var(--text-1);">${s.name}</td>
          <td style="text-transform: capitalize;">${s.service}</td>
          <td>${liveBadge}</td>
          <td>${shiftDisplay}</td>
          <td style="font-weight: bold; text-align: center;">${s.activeJobs}</td>
          <td>${formatDate(s.lastActive)}</td>
        </tr>
      `;
    }).join("");
  }

  // ==========================================
  // VIEW 6: REPORTS & ANALYTICS
  // ==========================================
  window.loadAnalyticsData = async function () {
    try {
      const res = await fetchAPI("/admin/reports");
      if (res.success && res.data) {
        analyticsDataCache = res.data;
        renderAnalyticsContent(res.data);
        renderCharts(res.data);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    }
  };

  function renderAnalyticsContent(d) {
    // Top Service Employees
    const empList = document.getElementById("topEmployeesList");
    if (!d.topEmployees || !d.topEmployees.length) {
      empList.innerHTML = `<div class="meta" style="padding:12px; text-align:center;">No employees found.</div>`;
    } else {
      empList.innerHTML = d.topEmployees.map((e, idx) => `
        <div class="list-row">
          <div>
            <span class="meta" style="margin-right: 8px;">#${idx + 1}</span>
            <span class="name">${e.fullName}</span>
            <div class="meta" style="font-size: 11px;">ID: ${e.employeeId} · <span style="text-transform:capitalize;">${e.serviceCategory}</span></div>
          </div>
          <div style="text-align: right;">
            <div class="value">★ ${e.rating}</div>
            <div class="meta" style="font-size: 11px;">${e.totalJobsCompleted} jobs done</div>
          </div>
        </div>
      `).join("");
    }

    // Top Service Categories
    const svcList = document.getElementById("topServicesList");
    if (!d.topServices || !d.topServices.length) {
      svcList.innerHTML = `<div class="meta" style="padding:12px; text-align:center;">No bookings recorded.</div>`;
    } else {
      svcList.innerHTML = d.topServices.map((s, idx) => `
        <div class="list-row">
          <div>
            <span class="meta" style="margin-right: 8px;">#${idx + 1}</span>
            <span class="name" style="text-transform:capitalize;">${s.name}</span>
            <div class="meta" style="font-size: 11px;">${s.count} times booked</div>
          </div>
          <div class="value">₹${s.revenue.toLocaleString("en-IN")}</div>
        </div>
      `).join("");
    }
  }

  function renderCharts(d) {
    // Destroy previous instances to prevent rendering glitches
    if (revenueTrendChart) revenueTrendChart.destroy();
    if (bookingBreakdownChart) bookingBreakdownChart.destroy();

    // 1) Revenue Trend Line Chart
    const revenueCtx = document.getElementById("revenueTrendChartCanvas");
    if (revenueCtx) {
      const labels = d.revenueTrends.map(r => r.label);
      const data = d.revenueTrends.map(r => r.revenue);

      revenueTrendChart = new Chart(revenueCtx, {
        type: "line",
        data: {
          labels: labels.length ? labels : ["Empty"],
          datasets: [{
            label: "Monthly Revenue (₹)",
            data: data.length ? data : [0],
            borderColor: "#0d9488",
            backgroundColor: "rgba(13, 148, 136, 0.08)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#0d9488",
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: "#94a3b8" } }
          },
          scales: {
            y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#94a3b8" } },
            x: { grid: { display: false }, ticks: { color: "#94a3b8" } }
          }
        }
      });
    }

    // 2) Booking breakdown Pie Chart
    const bookingCtx = document.getElementById("bookingBreakdownChartCanvas");
    if (bookingCtx) {
      const stats = d.bookingStats;
      bookingBreakdownChart = new Chart(bookingCtx, {
        type: "doughnut",
        data: {
          labels: ["Completed", "Pending", "Cancelled"],
          datasets: [{
            data: [stats.completed, stats.pending, stats.cancelled],
            backgroundColor: ["#10b981", "#f59e0b", "#f43f5e"],
            borderColor: "#111a2e",
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "right", labels: { color: "#94a3b8" } }
          }
        }
      });
    }
  }

  // Export Analytics CSV
  window.exportAnalyticsCSV = function () {
    if (!analyticsDataCache) {
      alert("No report data available to export. Refreshing analytics...");
      loadAnalyticsData();
      return;
    }

    const d = analyticsDataCache;
    let csvContent = "data:text/csv;charset=utf-8,";

    // 1) Title
    csvContent += "SERVICEHUB PLATFORM REPORTS & ANALYTICS SUMMARY\n\n";

    // 2) Revenue Trends Section
    csvContent += "MONTHLY REVENUE TRENDS\n";
    csvContent += "Month/Year,Total Revenue (INR),Bookings Count\n";
    d.revenueTrends.forEach(r => {
      csvContent += `"${r.label}",${r.revenue},${r.count}\n`;
    });
    csvContent += "\n";

    // 3) Booking breakdown Stats
    csvContent += "BOOKINGS STATUS BREAKDOWN\n";
    csvContent += "Status,Count\n";
    csvContent += `Completed,${d.bookingStats.completed}\n`;
    csvContent += `Pending,${d.bookingStats.pending}\n`;
    csvContent += `Cancelled,${d.bookingStats.cancelled}\n\n`;

    // 4) Top Service Categories
    csvContent += "TOP SERVICE CATEGORIES\n";
    csvContent += "Category Name,Bookings count,Total Revenue\n";
    d.topServices.forEach(s => {
      csvContent += `"${s.name}",${s.count},${s.revenue}\n`;
    });
    csvContent += "\n";

    // 5) Top Employees
    csvContent += "TOP WORKERS/EMPLOYEES PERFORMANCE\n";
    csvContent += "Employee ID,Full Name,Category,Rating,Jobs Handled\n";
    d.topEmployees.forEach(e => {
      csvContent += `${e.employeeId},"${e.fullName}","${e.serviceCategory}",${e.rating},${e.totalJobsCompleted}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ServiceHub_Platform_Analytics_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // INITIALIZATION AND EVENT LISTENERS
  // ==========================================
  
  // Set active view toggle buttons click triggers
  document.querySelectorAll(".menu button[data-view]").forEach((btn) => {
    btn.addEventListener("click", function () {
      const view = this.getAttribute("data-view");
      showView(view);
    });
  });

  // User tab UI Event triggers
  const userSearch = document.getElementById("userSearchInput");
  const userFilter = document.getElementById("userRoleFilter");
  if (userSearch) userSearch.addEventListener("input", () => {
    paginationState.users.page = 1;
    loadUsersData();
  });
  if (userFilter) userFilter.addEventListener("change", () => {
    paginationState.users.page = 1;
    loadUsersData();
  });

  document.getElementById("usersPrevBtn").addEventListener("click", () => {
    if (paginationState.users.page > 1) {
      paginationState.users.page--;
      loadUsersData();
    }
  });
  document.getElementById("usersNextBtn").addEventListener("click", () => {
    const { page, limit, total } = paginationState.users;
    if (page < Math.ceil(total / limit)) {
      paginationState.users.page++;
      loadUsersData();
    }
  });

  // Employee tab UI Event triggers
  const empSearch = document.getElementById("employeeSearchInput");
  const empFilter = document.getElementById("employeeCategoryFilter");
  if (empSearch) empSearch.addEventListener("input", () => {
    paginationState.employees.page = 1;
    loadEmployeesData();
  });
  if (empFilter) empFilter.addEventListener("change", () => {
    paginationState.employees.page = 1;
    loadEmployeesData();
  });

  document.getElementById("employeesPrevBtn").addEventListener("click", () => {
    if (paginationState.employees.page > 1) {
      paginationState.employees.page--;
      loadEmployeesData();
    }
  });
  document.getElementById("employeesNextBtn").addEventListener("click", () => {
    const { page, limit, total } = paginationState.employees;
    if (page < Math.ceil(total / limit)) {
      paginationState.employees.page++;
      loadEmployeesData();
    }
  });

  // Partner Requests filter change trigger
  const partnerFilter = document.getElementById("partnerStatusFilter");
  if (partnerFilter) partnerFilter.addEventListener("change", loadPartnerRequests);

  // Logout control trigger
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "/frontend/profile/login.html";
  });

  // Mobile sidebar support
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const sidebar = document.querySelector(".side");
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", function () {
      sidebar.classList.toggle("open");
    });
  }

  function handleResize() {
    if (window.innerWidth <= 768) {
      if (hamburgerBtn) hamburgerBtn.style.display = "block";
    } else {
      if (hamburgerBtn) hamburgerBtn.style.display = "none";
      if (sidebar) sidebar.classList.remove("open");
    }
  }
  window.addEventListener("resize", handleResize);
  handleResize();

  // Load active view on entry
  showView(currentView);

})();
