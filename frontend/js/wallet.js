document.addEventListener("DOMContentLoaded", () => {
    const storageKey = "servicehubChatState";
    const draftKey = "servicehubChatDrafts";
    const roomList = document.getElementById("roomList");
    const messageStream = document.getElementById("messageStream");
    const chatComposer = document.getElementById("chatComposer");
    const messageInput = document.getElementById("messageInput");
    const roleSelect = document.getElementById("roleSelect");
    const currentIdentity = document.getElementById("currentIdentity");
    const profileName = document.getElementById("profileName");
    const profileMeta = document.getElementById("profileMeta");
    const activeRoomTag = document.getElementById("activeRoomTag");
    const activeRoomTitle = document.getElementById("activeRoomTitle");
    const activeRoomDescription = document.getElementById("activeRoomDescription");
    const activeCount = document.getElementById("activeCount");
    const saveDraftBtn = document.getElementById("saveDraftBtn");
    const clearDraftBtn = document.getElementById("clearDraftBtn");
    const draftChips = document.querySelectorAll(".draft-chip");

    const rooms = [
        {
            id: "general",
            name: "General Chat",
            description: "Open conversation for customers and workers across the platform.",
            subtitle: "Everyone can talk here.",
            tone: "customer"
        },
        {
            id: "customer-help",
            name: "Customer Help",
            description: "Booking questions, service requests, and support from customers.",
            subtitle: "Ask anything about your booking.",
            tone: "customer"
        },
        {
            id: "worker-zone",
            name: "Worker Zone",
            description: "A clean space for workers to discuss timing, service quality, and fair work.",
            subtitle: "Worker conversations stay clear and practical.",
            tone: "worker"
        },
        {
            id: "fair-feedback",
            name: "Fair Feedback",
            description: "Discuss service quality, pricing, and any issue that needs a fair answer.",
            subtitle: "Transparent feedback only.",
            tone: "support"
        },
        {
            id: "reviews",
            name: "Reviews & Tips",
            description: "Share experience, recommendations, and service tips with the community.",
            subtitle: "Best practices and honest reviews.",
            tone: "partner"
        },
        {
            id: "support-desk",
            name: "Support Desk",
            description: "If a conversation needs escalation, support can step in here.",
            subtitle: "Help when the thread needs it.",
            tone: "support"
        }
    ];

    const roomColors = {
        general: ["#355ef5", "#0ea5e9"],
        "customer-help": ["#0ea5e9", "#14b8a6"],
        "worker-zone": ["#f97316", "#f59e0b"],
        "fair-feedback": ["#8b5cf6", "#ec4899"],
        reviews: ["#10b981", "#22c55e"],
        "support-desk": ["#64748b", "#0f172a"]
    };

    const user = JSON.parse(localStorage.getItem("user") || "null");
    const displayName = (user && (user.name || user.username || user.email)) ? String(user.name || user.username || user.email).split("@")[0] : "Guest";
    const currentRole = displayName === "Guest" ? "Customer" : (user && user.role ? String(user.role) : "Customer");
    const chatIdentity = `${displayName} • ${currentRole}`;
    let activeRoom = rooms[0].id;

    const seedState = () => {
        const seeded = {
            general: [
                createMessage("Aman", "Worker", "If any booking feels unclear, ask here first. Clear talk keeps the service fair.", "10:15 AM", "general"),
                createMessage("Priya", "Customer", "I like the new booking flow, but I want quicker response on urgent issues.", "10:18 AM", "general"),
                createMessage("Support Team", "Support", "We are here to keep the thread respectful and useful for everyone.", "10:20 AM", "general")
            ],
            "customer-help": [
                createMessage("Nikhil", "Customer", "My technician arrived late yesterday. Who do I notify so the record stays fair?", "9:40 AM", "customer-help"),
                createMessage("Support Team", "Support", "Please share the booking time and our team will check the service trail.", "9:44 AM", "customer-help")
            ],
            "worker-zone": [
                createMessage("Rohit", "Worker", "Workers should confirm the slot before leaving for the job. It helps everyone.", "8:50 AM", "worker-zone"),
                createMessage("ServiceHub", "Partner", "Good communication means fewer disputes and better ratings.", "8:53 AM", "worker-zone")
            ],
            "fair-feedback": [
                createMessage("Meera", "Customer", "The price was fair, but I want more clarity on spare parts charges.", "7:30 AM", "fair-feedback"),
                createMessage("Support Team", "Support", "That is valid feedback. Transparent pricing is always the goal.", "7:33 AM", "fair-feedback")
            ],
            reviews: [
                createMessage("Aman", "Worker", "Tip: leave a short review right after the job so details stay fresh.", "6:45 AM", "reviews"),
                createMessage("Kriti", "Customer", "A small note about behaviour is often as helpful as a star rating.", "6:49 AM", "reviews")
            ],
            "support-desk": [
                createMessage("Support Team", "Support", "Use this room when a discussion needs a neutral review.", "6:10 AM", "support-desk")
            ]
        };

        localStorage.setItem(storageKey, JSON.stringify(seeded));
        return seeded;
    };

    const loadState = () => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return seedState();
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return seedState();
            return parsed;
        } catch (error) {
            return seedState();
        }
    };

    const saveState = (state) => {
        localStorage.setItem(storageKey, JSON.stringify(state));
    };

    const loadDrafts = () => {
        try {
            return JSON.parse(localStorage.getItem(draftKey) || "{}");
        } catch (error) {
            return {};
        }
    };

    const saveDrafts = (drafts) => {
        localStorage.setItem(draftKey, JSON.stringify(drafts));
    };

    const formatTime = (date = new Date()) => {
        return new Intl.DateTimeFormat("en-IN", {
            hour: "numeric",
            minute: "2-digit"
        }).format(date);
    };

    const createMessage = (name, role, text, time, room) => {
        return {
            id: `${room}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            role,
            text,
            time,
            room
        };
    };

    const getRoomById = (roomId) => rooms.find((room) => room.id === roomId) || rooms[0];

    const getRoomMessages = (state, roomId) => state[roomId] || [];

    const initials = (name) => {
        return String(name || "G")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((chunk) => chunk[0])
            .join("")
            .toUpperCase();
    };

    const toneClass = (role) => {
        return String(role || "").toLowerCase();
    };

    const buildRoomButton = (room, count) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `room-btn ${room.id === activeRoom ? "active" : ""}`;
        button.innerHTML = `<strong>${room.name}</strong><span>${room.subtitle} • ${count} posts</span>`;
        button.addEventListener("click", () => {
            activeRoom = room.id;
            renderAll();
        });
        return button;
    };

    const renderRooms = (state) => {
        roomList.innerHTML = "";
        rooms.forEach((room) => {
            roomList.appendChild(buildRoomButton(room, getRoomMessages(state, room.id).length));
        });
    };

    const renderMessages = (state) => {
        const room = getRoomById(activeRoom);
        const messages = getRoomMessages(state, activeRoom);

        activeRoomTag.textContent = room.name;
        activeRoomTitle.textContent = room.name;
        activeRoomDescription.textContent = room.description;
        activeCount.textContent = `${Math.max(messages.length * 4 + 8, 12)} active voices`;

        messageStream.innerHTML = "";

        if (!messages.length) {
            const empty = document.createElement("div");
            empty.className = "chat-message";
            empty.innerHTML = `
                <div class="avatar">SH</div>
                <div>
                    <div class="message-head">
                        <div>
                            <div class="message-name">ServiceHub</div>
                            <div class="message-meta"><span class="badge support">Support</span><span class="badge">${room.name}</span></div>
                        </div>
                        <span class="badge">${formatTime()}</span>
                    </div>
                    <p class="message-text">No messages yet in this room. Start the conversation and keep it fair.</p>
                </div>
            `;
            messageStream.appendChild(empty);
            return;
        }

        messages.forEach((message) => {
            const messageCard = document.createElement("article");
            messageCard.className = "chat-message";
            const role = toneClass(message.role);
            const colors = roomColors[message.room] || roomColors.general;
            messageCard.innerHTML = `
                <div class="avatar" style="background: linear-gradient(135deg, ${colors[0]}, ${colors[1]});">${initials(message.name)}</div>
                <div>
                    <div class="message-head">
                        <div>
                            <div class="message-name">${message.name}</div>
                            <div class="message-meta">
                                <span class="badge ${role}">${message.role}</span>
                                <span class="badge">${room.name}</span>
                            </div>
                        </div>
                        <span class="badge">${message.time}</span>
                    </div>
                    <p class="message-text">${message.text}</p>
                </div>
            `;
            messageStream.appendChild(messageCard);
        });
    };

    const renderIdentity = () => {
        currentIdentity.textContent = chatIdentity;
        profileName.textContent = displayName;
        profileMeta.textContent = user ? `Signed in as ${user.email || displayName}. Your chat drafts and posts stay tied to this browser account.` : "Sign in to chat as your account and keep your discussions linked.";
    };

    const renderAll = () => {
        const state = loadState();
        const drafts = loadDrafts();
        renderRooms(state);
        renderMessages(state);
        messageInput.value = drafts[activeRoom] || "";
    };

    chatComposer.addEventListener("submit", (event) => {
        event.preventDefault();
        const text = messageInput.value.trim();
        if (!text) return;

        const state = loadState();
        const message = createMessage(displayName, roleSelect.value, text, formatTime(), activeRoom);
        state[activeRoom] = [...getRoomMessages(state, activeRoom), message];
        saveState(state);

        const drafts = loadDrafts();
        drafts[activeRoom] = "";
        saveDrafts(drafts);

        messageInput.value = "";
        renderAll();
        messageStream.scrollTop = messageStream.scrollHeight;
    });

    saveDraftBtn.addEventListener("click", () => {
        const drafts = loadDrafts();
        drafts[activeRoom] = messageInput.value;
        saveDrafts(drafts);
        saveDraftBtn.textContent = "Draft saved";
        setTimeout(() => (saveDraftBtn.textContent = "Save draft"), 1200);
    });

    clearDraftBtn.addEventListener("click", () => {
        messageInput.value = "";
        const drafts = loadDrafts();
        drafts[activeRoom] = "";
        saveDrafts(drafts);
    });

    roleSelect.addEventListener("change", () => {
        const roleLabel = roleSelect.value;
        const draftPrefix = `${displayName} • ${roleLabel}`;
        currentIdentity.textContent = draftPrefix;
    });

    draftChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            messageInput.value = chip.textContent.trim();
            messageInput.focus();
        });
    });

    renderIdentity();
    renderAll();
});