// Enhanced Admin Dashboard - JavaScript
(function () {
  const API = "http://localhost:5000/api";
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Auth Check
  if (!user || !user.token) {
    alert("Please login as admin first.");
    window.location.href = "/frontend/profile/login.html";
    return;
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${user.token}`
  };

  // ===== UTILITY FUNCTIONS =====

  function showAlert(msg, type = "info") {
    const note = document.getElementById("apiNote");
    note.style.display = "block";
    note.textContent = msg;
    note.style.background = type === "error" ? "#fee2e2" : "#fff8db";
    note.style.color = type === "error" ? "#991b1b" : "#854d0e";
    setTimeout(() => {
      note.style.display = "none";
    }, 5000);
  }

  async function fetchJson(url, options = {}) {
    try {
      const resp = await fetch(url, options);
      const raw = await resp.text();
      let data = null;

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (e) {
        throw new Error(`Invalid JSON response (${resp.status})`);
      }

      if (!resp.ok) {
        throw new Error(data.message || `Request failed (${resp.status})`);
      }
      return data;
    } catch (error) {
      showAlert("Error: " + error.message, "error");
      console.error(error);
      throw error;
    }
  }

  // Format helpers
  function formatCurrency(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-IN");
  }

  function getStatusBadge(status) {
    const statusMap = {
      approved: { class: "success", text: "Approved" },
      pending: { class: "warning", text: "Pending" },
      rejected: { class: "danger", text: "Rejected" },
      completed: { class: "success", text: "Completed" },
      cancelled: { class: "danger", text: "Cancelled" },
      paid: { class: "success", text: "Paid" },
      failed: { class: "danger", text: "Failed" },
      active: { class: "success", text: "Active" },
      inactive: { class: "danger", text: "Inactive" }
    };
    const s = statusMap[status] || { class: "info", text: status };
    return `<span class="badge badge-${s.class}">${s.text}</span>`;
  }

  // ===== NAVIGATION =====

  function switchView(viewName) {
    // Hide all panels
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));

    // Show selected panel
    const panel = document.getElementById(`view-${viewName}`);
    if (panel) {
      panel.classList.add("active");
    }

    // Update menu
    document.querySelectorAll(".menu-item").forEach(item => {
      item.classList.remove("active");
      if (item.dataset.view === viewName) {
        item.classList.add("active");
      }
    });

    // Update header
    const titleMap = {
      overview: { title: "Dashboard", desc: "Welcome back! Here's what's happening today." },
      partners: { title: "Partners", desc: "Manage your service providers" },
      bookings: { title: "Bookings", desc: "Track all service bookings" },
      users: { title: "Users", desc: "Manage customers and accounts" },
      services: { title: "Services", desc: "Manage service categories" },
      analytics: { title: "Analytics", desc: "View reports and insights" },
      settings: { title: "Settings", desc: "Configure system settings" }
    };

    const titles = titleMap[viewName] || titleMap.overview;
    document.querySelector(".header-left h1").textContent = titles.title;
    document.querySelector(".header-left p").textContent = titles.desc;

    // Load data
    if (viewName === "overview") {
      loadOverview();
    } else if (viewName === "partners") {
      loadPartners();
    } else if (viewName === "bookings") {
      loadBookings();
    } else if (viewName === "users") {
      loadUsers();
    } else if (viewName === "services") {
      loadServices();
    }
  }

  // ===== OVERVIEW/DASHBOARD =====

  async function loadOverview() {
    try {
      const res = await fetchJson(`${API}/admin/dashboard`, { headers: authHeaders });
      const d = res.data || {};

      document.getElementById("stat-users").textContent = d.users || 0;
      document.getElementById("stat-partners").textContent = d.partners || 0;
      document.getElementById("stat-bookings").textContent = d.totalBookings || 0;
      document.getElementById("stat-revenue").textContent = formatCurrency(d.totalRevenue || 0);
      document.getElementById("stat-pending").textContent = d.pendingBookings || 0;
      document.getElementById("stat-searching").textContent = d.searchingBookings || 0;
      document.getElementById("stat-completed").textContent = d.completedBookings || 0;
      document.getElementById("stat-rating").textContent = (d.avgRating || 0).toFixed(1) + " ⭐";

      showAlert("Dashboard updated successfully", "info");
    } catch (error) {
      console.error("Error loading overview:", error);
    }
  }

  // ===== PARTNERS MANAGEMENT =====

  async function loadPartners() {
    try {
      const status = document.getElementById("partnerStatusFilter")?.value || "";
      const service = document.getElementById("partnerServiceFilter")?.value || "";
      const search = document.getElementById("partnerSearch")?.value || "";

      let query = "?limit=100";
      if (status) query += `&approvalStatus=${encodeURIComponent(status)}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const res = await fetchJson(`${API}/admin/partners${query}`, { headers: authHeaders });
      const partners = res.data || [];

      const rows = partners.map(p => `
        <tr>
          <td><strong>${p.name || "-"}</strong></td>
          <td>${p.service || "-"}</td>
          <td>${getStatusBadge(p.approvalStatus)}</td>
          <td>${p.ratingAvg ? p.ratingAvg.toFixed(1) : "0"} ⭐</td>
          <td>${p.totalJobs || 0}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-small btn-primary" onclick="viewPartnerDetail('${p._id}')">
                <i class="fas fa-eye"></i>
              </button>
              ${p.approvalStatus === "pending" ? `
                <button class="btn btn-small btn-success" onclick="approvePartner('${p._id}')">
                  <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-small btn-danger" onclick="rejectPartner('${p._id}')">
                  <i class="fas fa-times"></i>
                </button>
              ` : ""}
              <button class="btn btn-small btn-danger" onclick="deletePartner('${p._id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join("");

      document.getElementById("partnersBody").innerHTML = rows || `
        <tr><td colspan="6" style="text-align: center; color: #999;">No partners found</td></tr>
      `;

      showAlert(`Loaded ${partners.length} partners`, "info");
    } catch (error) {
      console.error("Error loading partners:", error);
    }
  }

  window.approvePartner = async function (partnerId) {
    if (!confirm("Approve this partner?")) return;
    try {
      await fetchJson(`${API}/admin/partners/${partnerId}/approval`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ approvalStatus: "approved" })
      });
      showAlert("Partner approved successfully");
      loadPartners();
    } catch (error) {
      console.error("Error approving partner:", error);
    }
  };

  window.rejectPartner = async function (partnerId) {
    if (!confirm("Reject this partner?")) return;
    try {
      await fetchJson(`${API}/admin/partners/${partnerId}/approval`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ approvalStatus: "rejected" })
      });
      showAlert("Partner rejected successfully");
      loadPartners();
    } catch (error) {
      console.error("Error rejecting partner:", error);
    }
  };

  window.deletePartner = async function (partnerId) {
    if (!confirm("Delete this partner? This cannot be undone.")) return;
    try {
      await fetchJson(`${API}/admin/partners/${partnerId}`, {
        method: "DELETE",
        headers: authHeaders
      });
      showAlert("Partner deleted successfully");
      loadPartners();
    } catch (error) {
      console.error("Error deleting partner:", error);
    }
  };

  window.viewPartnerDetail = async function (partnerId) {
    // Show modal with partner details
    const modal = document.getElementById("detailModal");
    const modalBody = document.getElementById("modalBody");
    document.getElementById("modalTitle").textContent = "Partner Details";

    try {
      const res = await fetchJson(`${API}/admin/partners?limit=100`, { headers: authHeaders });
      const partner = res.data.find(p => p._id === partnerId);

      if (partner) {
        modalBody.innerHTML = `
          <div class="form-group">
            <label>Name</label>
            <input type="text" value="${partner.name || ""}" disabled>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="text" value="${partner.email || ""}" disabled>
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="text" value="${partner.phone || ""}" disabled>
          </div>
          <div class="form-group">
            <label>Service</label>
            <input type="text" value="${partner.service || ""}" disabled>
          </div>
          <div class="form-group">
            <label>Experience (Years)</label>
            <input type="text" value="${partner.experience || ""}" disabled>
          </div>
          <div class="form-group">
            <label>Address</label>
            <input type="text" value="${partner.address || ""}" disabled>
          </div>
          <div class="form-group">
            <label>Status</label>
            <input type="text" value="${partner.approvalStatus || ""}" disabled>
          </div>
          <div class="form-group">
            <label>Rating</label>
            <input type="text" value="${partner.ratingAvg || 0} ⭐ (${partner.totalJobs} jobs)" disabled>
          </div>
          <div class="form-group">
            <label>Joined</label>
            <input type="text" value="${formatDate(partner.createdAt)}" disabled>
          </div>
        `;
        modal.classList.add("active");
      }
    } catch (error) {
      console.error("Error fetching partner details:", error);
    }
  };

  // ===== BOOKINGS MANAGEMENT =====

  async function loadBookings() {
    try {
      const status = document.getElementById("bookingStatusFilter")?.value || "";
      const payment = document.getElementById("bookingPaymentFilter")?.value || "";

      let query = "?limit=100";
      if (status) query += `&status=${encodeURIComponent(status)}`;
      if (payment) query += `&paymentStatus=${encodeURIComponent(payment)}`;

      const res = await fetchJson(`${API}/admin/bookings${query}`, { headers: authHeaders });
      const bookings = res.data || [];

      const rows = bookings.map((b, i) => `
        <tr>
          <td><strong>BK-${String(i + 1).padStart(5, "0")}</strong></td>
          <td>${b.serviceName || "-"}</td>
          <td>${b.customerName || "-"}</td>
          <td>${getStatusBadge(b.status)}</td>
          <td>${getStatusBadge(b.paymentStatus)}</td>
          <td>${formatCurrency(b.price)}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-small btn-primary" onclick="viewBookingDetail('${b._id}')">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-small btn-danger" onclick="deleteBooking('${b._id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join("");

      document.getElementById("bookingsBody").innerHTML = rows || `
        <tr><td colspan="7" style="text-align: center; color: #999;">No bookings found</td></tr>
      `;

      showAlert(`Loaded ${bookings.length} bookings`, "info");
    } catch (error) {
      console.error("Error loading bookings:", error);
    }
  }

  window.deleteBooking = async function (bookingId) {
    if (!confirm("Delete this booking?")) return;
    try {
      await fetchJson(`${API}/admin/bookings/${bookingId}`, {
        method: "DELETE",
        headers: authHeaders
      });
      showAlert("Booking deleted successfully");
      loadBookings();
    } catch (error) {
      console.error("Error deleting booking:", error);
    }
  };

  window.viewBookingDetail = async function (bookingId) {
    const modal = document.getElementById("detailModal");
    const modalBody = document.getElementById("modalBody");
    document.getElementById("modalTitle").textContent = "Booking Details";

    try {
      const res = await fetchJson(`${API}/admin/bookings?limit=100`, { headers: authHeaders });
      const booking = res.data.find(b => b._id === bookingId);

      if (booking) {
        modalBody.innerHTML = `
          <div class="form-group">
            <label>Service Name</label>
            <input type="text" value="${booking.serviceName || ""}" disabled>
          </div>
          <div class="form-group">
            <label>Customer Name</label>
            <input type="text" value="${booking.customerName || ""}" disabled>
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="text" value="${booking.customerPhone || ""}" disabled>
          </div>
          <div class="form-group">
            <label>Address</label>
            <input type="text" value="${booking.address || ""}" disabled>
          </div>
          <div class="form-group">
            <label>Price</label>
            <input type="text" value="${formatCurrency(booking.price)}" disabled>
          </div>
          <div class="form-group">
            <label>Status</label>
            <input type="text" value="${booking.status}" disabled>
          </div>
          <div class="form-group">
            <label>Payment Status</label>
            <input type="text" value="${booking.paymentStatus}" disabled>
          </div>
          <div class="form-group">
            <label>Booked Date</label>
            <input type="text" value="${formatDate(booking.bookingDate)}" disabled>
          </div>
          ${booking.agent?.fullName ? `
            <div class="form-group">
              <label>Assigned Agent</label>
              <input type="text" value="${booking.agent.fullName}" disabled>
            </div>
          ` : ""}
        `;
        modal.classList.add("active");
      }
    } catch (error) {
      console.error("Error fetching booking details:", error);
    }
  };

  // ===== USERS MANAGEMENT =====

  async function loadUsers() {
    try {
      const search = document.getElementById("userSearch")?.value || "";
      const role = document.getElementById("userRoleFilter")?.value || "";

      let query = "?limit=100";
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (role) query += `&role=${encodeURIComponent(role)}`;

      const res = await fetchJson(`${API}/admin/users${query}`, { headers: authHeaders });
      const users = res.data || [];

      const rows = users.map(u => `
        <tr>
          <td><strong>${u.name || "-"}</strong></td>
          <td>${u.email || "-"}</td>
          <td>${getStatusBadge(u.role === "partner" ? "partner" : "active")}</td>
          <td>${formatCurrency(u.walletBalance || 0)}</td>
          <td>${formatDate(u.createdAt)}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-small btn-primary" onclick="viewUserDetail('${u._id}')">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-small btn-secondary" onclick="changeUserRole('${u._id}')">
                <i class="fas fa-edit"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join("");

      document.getElementById("usersBody").innerHTML = rows || `
        <tr><td colspan="6" style="text-align: center; color: #999;">No users found</td></tr>
      `;

      showAlert(`Loaded ${users.length} users`, "info");
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }

  window.viewUserDetail = async function (userId) {
    const modal = document.getElementById("detailModal");
    const modalBody = document.getElementById("modalBody");
    document.getElementById("modalTitle").textContent = "User Details";

    try {
      const res = await fetchJson(`${API}/admin/users?limit=100`, { headers: authHeaders });
      const user = res.data.find(u => u._id === userId);

      if (user) {
        modalBody.innerHTML = `
          <div class="form-group">
            <label>Name</label>
            <input type="text" value="${user.name || ""}" disabled>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="text" value="${user.email || ""}" disabled>
          </div>
          <div class="form-group">
            <label>Role</label>
            <input type="text" value="${user.role}" disabled>
          </div>
          <div class="form-group">
            <label>Wallet Balance</label>
            <input type="text" value="${formatCurrency(user.walletBalance || 0)}" disabled>
          </div>
          <div class="form-group">
            <label>Joined</label>
            <input type="text" value="${formatDate(user.createdAt)}" disabled>
          </div>
        `;
        modal.classList.add("active");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  window.changeUserRole = async function (userId) {
    const newRole = prompt("Enter new role (user/partner/admin):");
    if (!newRole || !["user", "partner", "admin"].includes(newRole)) {
      alert("Invalid role");
      return;
    }

    try {
      await fetchJson(`${API}/admin/users/${userId}/role`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ role: newRole })
      });
      showAlert("User role updated successfully");
      loadUsers();
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  // ===== SERVICES MANAGEMENT =====

  async function loadServices() {
    try {
      const res = await fetchJson(`${API}/admin/services`, { headers: authHeaders });
      const services = res.data || [];

      const rows = services.map(s => `
        <tr>
          <td><strong>${s.categoryId || "-"}</strong></td>
          <td>${s.categoryTitle || "-"}</td>
          <td>${(s.services || []).length}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-small btn-primary" onclick="editService('${s._id}')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-small btn-danger" onclick="deleteService('${s._id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join("");

      document.getElementById("servicesBody").innerHTML = rows || `
        <tr><td colspan="4" style="text-align: center; color: #999;">No services found</td></tr>
      `;

      showAlert(`Loaded ${services.length} service categories`, "info");
    } catch (error) {
      console.error("Error loading services:", error);
    }
  }

  window.createService = async function () {
    const categoryId = document.getElementById("svcCategoryId")?.value;
    const categoryTitle = document.getElementById("svcCategoryTitle")?.value;

    if (!categoryId || !categoryTitle) {
      showAlert("Please fill in all fields", "error");
      return;
    }

    try {
      await fetchJson(`${API}/admin/services`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ categoryId, categoryTitle, services: [] })
      });
      showAlert("Service category created successfully");
      document.getElementById("svcCategoryId").value = "";
      document.getElementById("svcCategoryTitle").value = "";
      loadServices();
    } catch (error) {
      console.error("Error creating service:", error);
    }
  };

  window.editService = function (serviceId) {
    alert("Edit functionality coming soon...");
  };

  window.deleteService = async function (serviceId) {
    if (!confirm("Delete this service category?")) return;
    try {
      // Note: Backend doesn't have delete endpoint yet
      showAlert("Delete functionality coming soon", "info");
      // loadServices();
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  };

  // ===== MODALS =====

  window.closeModal = function () {
    document.getElementById("detailModal").classList.remove("active");
  };

  document.getElementById("detailModal").addEventListener("click", function (e) {
    if (e.target === this) {
      closeModal();
    }
  });

  // ===== MENU NAVIGATION =====

  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", function () {
      const view = this.dataset.view;
      switchView(view);
    });
  });

  // ===== FILTER LISTENERS =====

  document.getElementById("partnerStatusFilter")?.addEventListener("change", loadPartners);
  document.getElementById("partnerSearch")?.addEventListener("input", loadPartners);
  document.getElementById("bookingStatusFilter")?.addEventListener("change", loadBookings);
  document.getElementById("bookingPaymentFilter")?.addEventListener("change", loadBookings);
  document.getElementById("userSearch")?.addEventListener("input", loadUsers);
  document.getElementById("userRoleFilter")?.addEventListener("change", loadUsers);

  // ===== LOGOUT =====

  window.logout = function () {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user");
      window.location.href = "/frontend/profile/login.html";
    }
  };

  // ===== INITIALIZE =====

  // Load initial data
  loadOverview();
})();
