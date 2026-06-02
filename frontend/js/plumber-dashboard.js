(function () {
  const API = "http://localhost:5000/api/partner/plumber";
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user || !user.token || user.role !== "partner") {
    window.location.href = "/frontend/profile/login.html";
    return;
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${user.token}`
  };

  const note = document.getElementById("apiNote");
  const body = document.getElementById("jobsBody");
  const cards = document.getElementById("cards");
  let currentJobIdForMarkDone = null;

  function showNote(msg) { note.style.display = "block"; note.textContent = msg; }
  function clearNote() { note.style.display = "none"; note.textContent = ""; }

  async function fetchJson(url, options = {}) {
    const resp = await fetch(url, options);
    const raw = await resp.text();
    const data = raw ? JSON.parse(raw) : {};
    if (!resp.ok) throw new Error(data.message || `Request failed (${resp.status})`);
    return data;
  }

  function renderCards(items) {
    const total = items.length;
    const pending = items.filter(x => x.status === "pending").length;
    const completed = items.filter(x => x.status === "completed").length;
    const active = total - completed;
    cards.innerHTML = [
      `<div class="card"><div class="k">Total Tasks</div><div class="v">${total}</div></div>`,
      `<div class="card"><div class="k">Active</div><div class="v">${active}</div></div>`,
      `<div class="card"><div class="k">Pending</div><div class="v">${pending}</div></div>`,
      `<div class="card"><div class="k">Completed</div><div class="v">${completed}</div></div>`
    ].join("");
  }

  function progressSelect(id, current) {
    const options = ["on_the_way", "arrived", "service_started"];
    return `
      <div class="row-actions">
        <select id="p-${id}">
          ${options.map(o => `<option value="${o}" ${o === current ? "selected" : ""}>${o}</option>`).join("")}
        </select>
        <button class="btn primary" onclick="window.__updateProgress('${id}')">Save</button>
        <button class="btn warn" onclick="window.__openMarkDoneModal('${id}')">Mark Done</button>
      </div>
    `;
  }

  async function loadJobs() {
    try {
      clearNote();
      const status = document.getElementById("statusFilter").value;
      const q = status ? `?status=${encodeURIComponent(status)}` : "";
      const res = await fetchJson(`${API}/jobs${q}`, { headers: authHeaders });
      const items = res.data || [];
      renderCards(items);
      body.innerHTML = items.map((j) => {
        let actionCell = '';
        if (j.status === 'completed') {
          actionCell = `<span class="badge-completed">✓ Completed by ${j.completedBy?.employeeName || 'Unknown'}</span>`;
        } else {
          actionCell = progressSelect(j._id, j.progress || "on_the_way");
        }
        return `
        <tr>
          <td>${j.serviceName || "-"}</td>
          <td>${j.customerName || "-"}</td>
          <td>${j.address || "-"}</td>
          <td>${j.status || "-"}</td>
          <td>${j.progress || "-"}</td>
          <td>${actionCell}</td>
        </tr>
      `;
      }).join("") || `<tr><td colspan="6">No plumber tasks found.</td></tr>`;
    } catch (e) {
      showNote(e.message);
      if (String(e.message).toLowerCase().includes("plumber service employees only")) {
        localStorage.removeItem("user");
        setTimeout(() => { window.location.href = "/frontend/profile/login.html"; }, 700);
      }
    }
  }

  window.__updateProgress = async function (id) {
    try {
      clearNote();
      const progress = document.getElementById(`p-${id}`).value;
      await fetchJson(`${API}/jobs/${id}/progress`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ progress })
      });
      await loadJobs();
    } catch (e) {
      showNote(e.message);
    }
  };

  window.__openMarkDoneModal = function (id) {
    currentJobIdForMarkDone = id;
    document.getElementById("markDoneModal").classList.remove("hidden");
    document.getElementById("employeeUserId").value = "";
    document.getElementById("employeeUserId").focus();
  };

  window.__closeMarkDoneModal = function () {
    document.getElementById("markDoneModal").classList.add("hidden");
    currentJobIdForMarkDone = null;
    document.getElementById("employeeUserId").value = "";
  };

  document.getElementById("markDoneForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!currentJobIdForMarkDone) {
      showNote("❌ No job selected");
      return;
    }

    const employeeUserId = document.getElementById("employeeUserId").value.trim();
    if (!employeeUserId) {
      showNote("❌ Please enter your user ID");
      return;
    }

    try {
      clearNote();
      console.log("📤 Employee Verification - Marking job as complete...");
      console.log("   Job ID:", currentJobIdForMarkDone);
      console.log("   Employee User ID:", employeeUserId);
      
      const response = await fetchJson(`${API}/jobs/${currentJobIdForMarkDone}/mark-done`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ employeeUserId })
      });
      
      console.log("✅ Success! Booking completed:", response);
      window.__closeMarkDoneModal();
      await loadJobs();
      showNote("✅ Booking completed by " + response.data?.completedBy?.employeeName);
    } catch (e) {
      console.error("❌ Verification failed:", e.message);
      showNote("❌ " + e.message);
    }
  });

  document.getElementById("reloadBtn").addEventListener("click", loadJobs);
  document.getElementById("statusFilter").addEventListener("change", loadJobs);
  document.getElementById("logoutBtn").addEventListener("click", function () {
    localStorage.removeItem("user");
    window.location.href = "/frontend/profile/login.html";
  });
  document.getElementById("markDoneForm").addEventListener("submit", window.__submitMarkDoneForm);

  loadJobs();
})();

