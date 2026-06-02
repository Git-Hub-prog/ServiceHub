document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const trackingContent = document.getElementById("trackingContent");
    const activeBookingList = document.getElementById("activeBookingList");
    const pastBookingList = document.getElementById("pastBookingList");
    const bookingSearch = document.getElementById("bookingSearch");
    const statusFilters = document.getElementById("statusFilters");
    const refreshButton = document.getElementById("refreshButton");
    const totalBookings = document.getElementById("totalBookings");
    const activeBookingsCount = document.getElementById("activeBookingsCount");
    const completedBookingsCount = document.getElementById("completedBookingsCount");
    const paidBookingsCount = document.getElementById("paidBookingsCount");

    if (!user || !user.token) {
        window.location.href = "../profile/login.html";
        return;
    }

    const API_URL = "http://localhost:5000/api/bookings/mybookings";
    const progressMap = {
        searching: { label: "Searching", step: 0, tone: "warn" },
        on_the_way: { label: "On the way", step: 1, tone: "active" },
        arrived: { label: "Arrived", step: 2, tone: "active" },
        service_started: { label: "In progress", step: 3, tone: "active" },
        completed: { label: "Completed", step: 4, tone: "ok" }
    };

    let allBookings = [];
    let activeFilter = "all";
    let searchTerm = "";
    let refreshTimer = null;

    const safeText = (value, fallback = "N/A") => {
        if (value === null || value === undefined) return fallback;
        const text = String(value).trim();
        return text ? text : fallback;
    };

    const escapeHtml = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");

    const normalize = (value) => String(value || "").toLowerCase().trim();

    const formatDateTime = (value) => {
        if (!value) return "N/A";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "N/A";
        return date.toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatShortDate = (value) => {
        if (!value) return "N/A";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "N/A";
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

    const computeEta = (etaTime) => {
        if (!etaTime) return "ETA unavailable";
        const diff = new Date(etaTime).getTime() - Date.now();
        if (Number.isNaN(diff) || diff <= 0) return "Arriving shortly";
        const mins = Math.ceil(diff / (1000 * 60));
        return `${mins} min`;
    };

    const maskPhone = (value) => {
        if (!value) return '';
        const digits = String(value).replace(/\D/g, '');
        if (digits.length <= 4) return digits;
        const last = digits.slice(-4);
        return `****${last}`;
    };

    const notify = (message) => {
        const node = document.createElement("div");
        node.className = "floating-notice";
        node.textContent = message;
        document.body.appendChild(node);
        requestAnimationFrame(() => node.classList.add("show"));
        setTimeout(() => {
            node.classList.remove("show");
            setTimeout(() => node.remove(), 250);
        }, 2400);
    };

    const makeStatusBadge = (text, tone) => `<span class="badge badge-${tone}">${escapeHtml(text)}</span>`;
    const progressStepClass = (current, index) => (current >= index ? "progress-step done" : "progress-step");

    const getStatusTone = (status) => {
        if (status === "completed") return "ok";
        if (status === "cancelled") return "bad";
        return "active";
    };

    const serviceArtwork = (booking) => {
        const svc = String(booking?.serviceName || booking?.agent?.serviceType || '');
        const findImageByTitle = (title) => {
            try {
                if (!window.servicesData || !Array.isArray(window.servicesData)) return null;
                const t = String(title || '').toLowerCase().trim();
                for (const cat of window.servicesData) {
                    if (!cat.services) continue;
                    for (const s of cat.services) {
                        if (String(s.title || '').toLowerCase().trim() === t) return s.image;
                    }
                }
            } catch (e) {
                return null;
            }
            return null;
        };

        const img = findImageByTitle(svc) || findImageByTitle(booking?.agent?.serviceType) || null;
        if (img) return { src: img, alt: svc };

        const text = normalize(`${booking?.serviceName || ""} ${booking?.agent?.serviceType || ""}`);
        if (text.includes("car")) return { src: "../images/car-cleaning.avif", alt: "Car cleaning service" };
        if (text.includes("electric")) return { src: "../images/Electricians.jpeg", alt: "Electrician service" };
        if (text.includes("plumb") || text.includes("pipe") || text.includes("tap")) return { src: "../images/plumber.jpg", alt: "Plumber service" };
        if (text.includes("salon") || text.includes("hair") || text.includes("spa")) return { src: "../images/salon.webp", alt: "Salon service" };
        if (text.includes("tutor") || text.includes("study") || text.includes("math")) return { src: "../images/tutor-service.jpg", alt: "Tutor service" };
        return { src: "../images/booking-illustration.svg", alt: "Booking illustration" };
    };

    const bookingScope = (booking) => {
        if (!booking) return "active";
        if (booking.status === "completed") return "completed";
        if (booking.status === "cancelled") return "cancelled";
        return "active";
    };

    const getDisplayStatus = (booking) => {
        if (!booking) return "pending";
        if (booking.status === "completed") return "completed";
        if (booking.status === "cancelled") return "cancelled";
        if (booking.assignmentStatus === "assigned" || booking.progress === "on_the_way" || booking.progress === "arrived" || booking.progress === "service_started") {
            return booking.progress || "assigned";
        }
        return booking.assignmentStatus || booking.status || "pending";
    };

    const applyFilters = (bookings) => {
        return bookings.filter((booking) => {
            const scope = bookingScope(booking);
            const matchesScope = activeFilter === "all"
                || (activeFilter === "active" && scope === "active")
                || (activeFilter === "completed" && scope === "completed")
                || (activeFilter === "cancelled" && scope === "cancelled");

            const haystack = [
                booking.serviceName,
                booking.customerName,
                booking.address,
                booking.status,
                booking.paymentStatus,
                booking.assignmentStatus,
                booking.agent?.fullName,
                booking.agent?.serviceType
            ].map(normalize).join(" ");
            const matchesSearch = !searchTerm || haystack.includes(searchTerm);

            return matchesScope && matchesSearch;
        });
    };

    const getProgress = (booking) => progressMap[booking?.progress] || progressMap[bookingScope(booking) === "completed" ? "completed" : bookingScope(booking) === "cancelled" ? "searching" : "on_the_way"];

    const renderProgressTimeline = (booking) => {
        const progress = getProgress(booking);
        const current = progress.step;
        const steps = [
            { dot: 1, title: "Search", description: "Finding the best worker" },
            { dot: 2, title: "On route", description: "Worker is traveling" },
            { dot: 3, title: "At location", description: "Arrived at your address" },
            { dot: 4, title: "Done", description: "Service completed" }
        ];

        return `
            <div class="progress-track">
                <div class="progress-line"><span style="width:${Math.min(current * 25, 100)}%"></span></div>
                <div class="progress-steps">
                    ${steps.map((step, index) => `
                        <div class="${progressStepClass(current, index + 1)}">
                            <div class="step-dot">${step.dot}</div>
                            <div class="step-label">${step.title}</div>
                            <div class="step-copy">${step.description}</div>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    };

    const renderTracking = (booking) => {
        if (!booking) {
            trackingContent.innerHTML = `
                <div class="empty-card">
                    No active booking right now. Once you book a service, it will appear here with live status.
                </div>
            `;
            return;
        }

        const progress = getProgress(booking);
        const hasAgent = Boolean(booking.agent?.fullName && normalize(booking.agent.fullName) !== "will be assigned soon");
        const searching = booking.assignmentStatus === "searching" || !hasAgent;
        const serviceVisual = serviceArtwork(booking);

        trackingContent.innerHTML = `
            <div class="tracking-card">
                <div class="tracking-head">
                    <div>
                        <h3>${escapeHtml(safeText(booking.serviceName))}</h3>
                        <div class="tracking-meta">
                            <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(formatDateTime(booking.bookingDate))}</span>
                            <span><i class="fa-solid fa-circle-dot"></i> ${escapeHtml(progress.label)}</span>
                            <span><i class="fa-solid fa-wallet"></i> ${escapeHtml(safeText(booking.paymentStatus, "pending").toUpperCase())}</span>
                        </div>
                    </div>
                    ${makeStatusBadge(progress.label.toUpperCase(), progress.tone)}
                </div>

                <div class="status-grid">
                    <div class="status-card">
                        <div class="status-label">Assignment</div>
                        <div class="status-value">${searching ? "Searching" : "Assigned"}</div>
                    </div>
                    <div class="status-card">
                        <div class="status-label">Estimated arrival</div>
                        <div class="status-value">${searching ? "Waiting" : escapeHtml(computeEta(booking.estimatedArrivalTime))}</div>
                    </div>
                    <div class="status-card">
                        <div class="status-label">Service type</div>
                        <div class="status-value">${escapeHtml(safeText(booking.agent?.serviceType, booking.serviceName))}</div>
                    </div>
                    <div class="status-card">
                        <div class="status-label">Booking date</div>
                        <div class="status-value">${escapeHtml(formatShortDate(booking.bookingDate))}</div>
                    </div>
                </div>

                ${searching ? `<div class="searching-banner">We are still matching a suitable worker for this booking.</div>` : ""}
                ${renderProgressTimeline(booking)}

                <div class="agent-strip">
                    <div class="agent-left">
                            <div class="agent-icon"><img src="${serviceVisual.src}" alt="${escapeHtml(serviceVisual.alt)}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"></div>
                            <div>
                                <h4 class="agent-title">${searching ? "Worker assignment in progress" : escapeHtml(safeText(booking.agent?.fullName, "Assigned worker"))}</h4>
                                <p class="agent-sub">${searching ? escapeHtml('Contact will appear once assigned') : escapeHtml(maskPhone(booking.agent?.contactNumber || ''))}</p>
                            </div>
                        </div>
                        ${makeStatusBadge(searching ? "Searching" : "Assigned", searching ? "warn" : "ok")}
                        ${!searching && booking.agent?.contactNumber ? `<div class="agent-actions"><a class="action-btn" href="tel:${escapeHtml(booking.agent.contactNumber)}"><i class="fa-solid fa-phone"></i> Call</a></div>` : ''}
                </div>

                <div class="kpi-grid">
                    <div class="kpi"><div class="label">Order ID</div><div class="value">${escapeHtml(booking._id?.slice(-8)?.toUpperCase() || "N/A")}</div></div>
                    <div class="kpi"><div class="label">Current status</div><div class="value">${escapeHtml(progress.label)}</div></div>
                    <div class="kpi"><div class="label">Amount</div><div class="value">${escapeHtml(formatCurrency(booking.price))}</div></div>
                </div>
            </div>
        `;
    };

    const renderBookingCard = (booking) => {
        const status = bookingScope(booking);
        const progress = getProgress(booking);
        const artwork = serviceArtwork(booking);
        const displayStatus = getDisplayStatus(booking);
        const statusTone = displayStatus === "completed" ? "ok" : displayStatus === "cancelled" ? "bad" : (booking.assignmentStatus === "assigned" || booking.progress === "on_the_way" || booking.progress === "arrived" || booking.progress === "service_started") ? "active" : "warn";
        const hasAgent = Boolean(booking.agent?.fullName && normalize(booking.agent.fullName) !== "will be assigned soon");

        const primaryAction = status === "active"
            ? `<button class="action-btn primary" type="button" data-action="track" data-booking-id="${booking._id}"><i class="fa-solid fa-location-crosshairs"></i> Track</button>`
            : `<button class="action-btn primary" type="button" data-action="rebook" data-service="${escapeHtml(booking.serviceName)}"><i class="fa-solid fa-repeat"></i> Book again</button>`;

        const secondaryAction = hasAgent && booking.agent?.contactNumber
            ? `<a class="action-btn" href="tel:${escapeHtml(booking.agent.contactNumber)}"><i class="fa-solid fa-phone"></i> Call worker</a>`
            : `<button class="action-btn" type="button" data-action="copy" data-copy="${escapeHtml(booking._id)}"><i class="fa-regular fa-copy"></i> Copy ID</button>`;

        // cancellation action: allow user to attempt cancellation for active bookings
        const canAttemptCancel = status === "active" && booking.status === "pending";
        const cancelAction = canAttemptCancel
            ? `<button class="action-btn danger" type="button" data-action="cancel" data-booking-id="${booking._id}"><i class="fa-solid fa-trash"></i> Cancel</button>`
            : ``;

        return `
            <article class="booking-card" data-status="${escapeHtml(status)}" data-booking-id="${escapeHtml(booking._id)}">
                <div class="booking-card-grid">
                    <div class="booking-thumb">
                        <img src="${artwork.src}" alt="${escapeHtml(artwork.alt)}">
                    </div>

                    <div class="booking-body">
                        <div class="booking-title-row">
                            <div>
                                <h3 class="booking-title">${escapeHtml(safeText(booking.serviceName))}</h3>
                                <p class="booking-sub">${escapeHtml(safeText(booking.address, "Service address not available"))}</p>
                            </div>
                            ${makeStatusBadge(safeText(displayStatus, "pending").toUpperCase(), statusTone)}
                        </div>

                        <div class="booking-meta-row">
                            <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(formatDateTime(booking.bookingDate))}</span>
                            <span><i class="fa-solid fa-wrench"></i> ${escapeHtml(safeText(getDisplayStatus(booking), "searching").replace(/_/g, " "))}</span>
                            <span><i class="fa-solid fa-credit-card"></i> ${escapeHtml(safeText(booking.paymentStatus, "pending").toUpperCase())}</span>
                        </div>

                        <div class="booking-tags">
                            <span class="tag">${escapeHtml(progress.label)}</span>
                            <span class="tag">${escapeHtml(hasAgent ? safeText(booking.agent?.fullName) : "No worker yet")}</span>
                            <span class="tag">${escapeHtml(formatCurrency(booking.price))}</span>
                        </div>
                    </div>

                    <div class="booking-right">
                        <div class="booking-price">${escapeHtml(formatCurrency(booking.price))}</div>
                        <div class="booking-actions">
                            ${primaryAction}
                            ${secondaryAction}
                            ${cancelAction}
                        </div>
                    </div>
                </div>
            </article>
        `;
    };

    const updateSummary = (bookings) => {
        totalBookings.textContent = String(bookings.length);
        activeBookingsCount.textContent = String(bookings.filter((booking) => bookingScope(booking) === "active").length);
        completedBookingsCount.textContent = String(bookings.filter((booking) => bookingScope(booking) === "completed").length);
        paidBookingsCount.textContent = String(bookings.filter((booking) => booking.paymentStatus === "paid").length);
    };

    const renderEmptySection = (message) => `<div class="empty-card">${escapeHtml(message)}</div>`;

    const renderConnectionIssue = () => `
        <div class="error-box">
            <div style="font-weight:800; margin-bottom:6px;">Bookings API is unreachable</div>
            <div style="margin-bottom:12px;">The dashboard could not connect to the backend on port 5000. Start the backend server, then use retry.</div>
            <button class="action-btn primary" type="button" id="retryBookingsButton"><i class="fa-solid fa-rotate"></i> Retry</button>
        </div>
    `;

    const renderLists = () => {
        const filtered = applyFilters(allBookings);
        const activeBookings = filtered.filter((booking) => bookingScope(booking) === "active");
        const pastBookings = filtered.filter((booking) => bookingScope(booking) !== "active");
        const searchRequested = searchTerm.length > 0;
        const trackedBooking = searchRequested ? (activeBookings[0] || filtered[0] || null) : null;

        updateSummary(allBookings);
        renderTracking(trackedBooking);

        activeBookingList.innerHTML = `
            <h3 class="section-label">Active bookings</h3>
            ${activeBookings.length ? activeBookings.map(renderBookingCard).join("") : renderEmptySection("No active bookings match your filters.")}
        `;

        pastBookingList.innerHTML = `
            <h3 class="section-label">Past bookings</h3>
            ${pastBookings.length ? pastBookings.map(renderBookingCard).join("") : renderEmptySection("No completed or cancelled bookings match your filters.")}
        `;
    };

    const schedulePolling = () => {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }

        if (allBookings.some((booking) => booking.assignmentStatus === "searching" || booking.status === "pending")) {
            refreshTimer = setInterval(() => {
                loadBookings(false);
            }, 20000);
        }
    };

    const loadBookings = async (showToast = true) => {
        try {
            const response = await fetch(API_URL, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            const payload = await response.json();
            if (response.status === 401) {
                localStorage.removeItem("user");
                window.location.href = "../profile/login.html";
                return;
            }
            if (!response.ok) {
                throw new Error(payload.message || "Failed to fetch bookings");
            }

            allBookings = Array.isArray(payload) ? payload : [];
            if (!allBookings.length) {
                trackingContent.innerHTML = `
                    <div class="empty-card">
                        You do not have any bookings yet. Book a service to start tracking progress here.
                    </div>
                `;
                activeBookingList.innerHTML = renderEmptySection("No active bookings yet.");
                pastBookingList.innerHTML = renderEmptySection("No booking history yet.");
                updateSummary([]);
                if (refreshTimer) {
                    clearInterval(refreshTimer);
                    refreshTimer = null;
                }
                return;
            }

            const notified = JSON.parse(localStorage.getItem("assignedBookingNotice") || "{}");
            allBookings.forEach((booking) => {
                if (booking.assignmentStatus === "assigned" && booking.agent?.fullName && !notified[booking._id]) {
                    notify(`Worker assigned: ${booking.agent.fullName} for ${booking.serviceName}`);
                    notified[booking._id] = true;
                }
            });
            localStorage.setItem("assignedBookingNotice", JSON.stringify(notified));

            renderLists();
            schedulePolling();
            if (showToast) notify("Bookings refreshed");
        } catch (error) {
            console.error("Booking load error:", error);
            const connectionLost = normalize(error?.message).includes("failed to fetch") || normalize(error?.message).includes("networkerror");
            const fallbackMessage = connectionLost ? renderConnectionIssue() : `<div class="error-box">${escapeHtml(error.message)}</div>`;
            trackingContent.innerHTML = fallbackMessage;
            activeBookingList.innerHTML = connectionLost
                ? renderConnectionIssue()
                : `<div class="error-box">Could not load booking history.</div>`;
            pastBookingList.innerHTML = connectionLost ? renderEmptySection("No booking history loaded because the API is offline.") : "";
            if (refreshTimer) {
                clearInterval(refreshTimer);
                refreshTimer = null;
            }

            setTimeout(() => {
                const retryButton = document.getElementById("retryBookingsButton");
                if (retryButton) {
                    retryButton.addEventListener("click", () => loadBookings(true));
                }
            }, 0);
        }
    };

    statusFilters.addEventListener("click", (event) => {
        const button = event.target.closest(".filter-pill");
        if (!button) return;
        activeFilter = button.dataset.filter || "all";
        statusFilters.querySelectorAll(".filter-pill").forEach((item) => item.classList.toggle("is-active", item === button));
        renderLists();
    });

    bookingSearch.addEventListener("input", (event) => {
        searchTerm = normalize(event.target.value);
        renderLists();
    });

    refreshButton.addEventListener("click", () => loadBookings(true));

    document.addEventListener("click", async (event) => {
        const copyButton = event.target.closest("[data-action='copy']");
        const trackButton = event.target.closest("[data-action='track']");
        const rebookButton = event.target.closest("[data-action='rebook']");

        if (copyButton) {
            const value = copyButton.dataset.copy || "";
            try {
                await navigator.clipboard.writeText(value);
                notify("Booking ID copied");
            } catch {
                notify("Could not copy booking ID");
            }
        }

        if (trackButton) {
            document.getElementById("trackingSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        if (rebookButton) {
            const serviceName = encodeURIComponent(rebookButton.dataset.service || "");
            window.location.href = `../services/all-services.html?service=${serviceName}`;
        }

        const cancelButton = event.target.closest("[data-action='cancel']");
        if (cancelButton) {
            const id = cancelButton.dataset.bookingId;
            if (!id) return;
            const ok = confirm('Are you sure you want to cancel this booking?');
            if (!ok) return;
            try {
                cancelButton.disabled = true;
                cancelButton.classList.add('is-loading');

                const resp = await fetch(`http://localhost:5000/api/bookings/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                const raw = await resp.text();
                let payload = {};
                if (raw) {
                    try {
                        payload = JSON.parse(raw);
                    } catch {
                        payload = { message: raw };
                    }
                }
                if (!resp.ok) {
                    notify(payload.message || 'Could not cancel booking');
                } else {
                    notify(payload.deleted ? 'Booking deleted from history' : 'Booking cancelled');
                    // remove from local state and re-render
                    allBookings = allBookings.filter(b => String(b._id) !== String(id));
                    renderLists();
                    loadBookings(false);
                }
            } catch (e) {
                console.error('Cancel request failed', e);
                notify('Unable to cancel booking. Please try again.');
            } finally {
                cancelButton.disabled = false;
                cancelButton.classList.remove('is-loading');
            }
        }
    });

    loadBookings(false);
});
