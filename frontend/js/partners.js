document.addEventListener("DOMContentLoaded", async function () {
    const loading = document.getElementById("loading");
    const partnersGrid = document.getElementById("partnersGrid");
    const highlightPartnerId = localStorage.getItem('newPartnerId');
    const highlightPartnerName = localStorage.getItem('newPartnerName');

    if (!partnersGrid) return;

    const avatarThemes = [
        { top: '#f0f9ff', bottom: '#dbeafe', accent1: '#38bdf8', accent2: '#2563eb', chipBg: '#dbeafe', chipText: '#1d4ed8' },
        { top: '#fff7ed', bottom: '#ffedd5', accent1: '#fb923c', accent2: '#f97316', chipBg: '#ffedd5', chipText: '#c2410c' },
        { top: '#f0fdf4', bottom: '#dcfce7', accent1: '#34d399', accent2: '#10b981', chipBg: '#dcfce7', chipText: '#047857' },
        { top: '#fdf2f8', bottom: '#fce7f3', accent1: '#f472b6', accent2: '#ec4899', chipBg: '#fce7f3', chipText: '#be185d' },
        { top: '#f8fafc', bottom: '#e2e8f0', accent1: '#64748b', accent2: '#0f172a', chipBg: '#e2e8f0', chipText: '#334155' }
    ];

    const localFallbackPartners = [
        {
            name: "Aman Shah",
            service: "Electrician",
            experience: 6,
            email: "aman.shah@example.com",
            phone: "9876543210",
            address: "Alkapuri, Vadodara",
            createdAt: new Date().toISOString()
        },
        {
            name: "Rohit Parmar",
            service: "Plumber",
            experience: 8,
            email: "rohit.parmar@example.com",
            phone: "9123456780",
            address: "Akota, Vadodara",
            createdAt: new Date().toISOString()
        },
        {
            name: "Nikhil Patel",
            service: "AC Repair",
            experience: 5,
            email: "nikhil.patel@example.com",
            phone: "9988776655",
            address: "Gotri, Vadodara",
            createdAt: new Date().toISOString()
        }
    ];

    function renderPartners(partners, note) {
        loading.style.display = "none";
        partnersGrid.style.display = "grid";
        partnersGrid.innerHTML = "";

        const existingNote = document.getElementById('partnersNote');
        if (existingNote) existingNote.remove();

        if (note) {
            partnersGrid.insertAdjacentHTML(
                "beforebegin",
                `<div id="partnersNote" style="text-align:center; color:#b45309; margin: 20px 0 0; font-weight:600;">${note}</div>`
            );
        }

        if (!partners || partners.length === 0) {
            partnersGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6b7280;">
                    <h2>No partners registered yet.</h2>
                    <a href="become-partner.html" style="color: #2563eb; text-decoration: underline;">Be the first to join us!</a>
                </div>
            `;
            return;
        }

        partners.forEach((partner) => {
            const card = document.createElement("div");
            card.className = "partner-card";
            if (highlightPartnerId && String(partner._id) === String(highlightPartnerId)) {
                card.style.outline = "3px solid #2563eb";
                card.style.boxShadow = "0 0 0 6px rgba(37, 99, 235, 0.12), 0 18px 40px rgba(15, 23, 42, 0.18)";
                card.dataset.highlighted = "true";
            }
            const theme = avatarThemes[Math.abs((partner.name || "").length + (partner.service || "").length) % avatarThemes.length];
            const avatarUrl = createAvatarSvg(partner, theme);
            card.style.setProperty('--card-top', theme.top);
            card.style.setProperty('--card-bottom', theme.bottom);
            card.style.setProperty('--card-accent-1', theme.accent1);
            card.style.setProperty('--card-accent-2', theme.accent2);
            card.style.setProperty('--chip-bg', theme.chipBg);
            card.style.setProperty('--chip-text', theme.chipText);

            const joinedDate = new Date(partner.createdAt || Date.now());
            const isRecent = (new Date() - joinedDate) < (7 * 24 * 60 * 60 * 1000);

            card.innerHTML = `
                <div class="partner-topbar"></div>
                <div class="partner-card-inner">
                <div class="partner-header">
                    <span class="partner-name">${partner.name}</span>
                    <span class="partner-category">${partner.service}</span>
                </div>
                <div class="partner-avatar-wrap">
                    <img class="partner-avatar" src="${avatarUrl}" alt="${partner.name} avatar">
                </div>
                <div class="partner-info">
                    <strong>Joined:</strong> ${joinedDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    })} ${isRecent ? '<span class="badge-recent">New</span>' : ''}
                </div>
                <div class="partner-info">
                    <strong>Experience:</strong> ${partner.experience} Years
                </div>
                <div class="partner-body">
                <div class="partner-info">
                    <strong>📧</strong> ${partner.email}
                </div>
                <div class="partner-info">
                    <strong>📞</strong> ${partner.phone}
                </div>
                <div class="partner-info">
                    <strong>📍 Area:</strong> ${partner.address}
                </div>
                </div>
                </div>
            `;
            partnersGrid.appendChild(card);
        });

        if (highlightPartnerId) {
            const highlightedCard = partnersGrid.querySelector('[data-highlighted="true"]');
            if (highlightedCard) {
                highlightedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (highlightPartnerName) {
                    const note = document.createElement('div');
                    note.id = 'partnersNote';
                    note.style.textAlign = 'center';
                    note.style.color = '#1d4ed8';
                    note.style.margin = '20px 0 0';
                    note.style.fontWeight = '700';
                    note.textContent = `${highlightPartnerName} is now registered and shown below.`;
                    partnersGrid.parentNode.insertBefore(note, partnersGrid);
                }
                localStorage.removeItem('newPartnerId');
                localStorage.removeItem('newPartnerName');
            }
        }
    }

        function createAvatarSvg(partner, theme) {
                const initials = String(partner.name || 'P')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0].toUpperCase())
                        .join('');

                const nameHash = Array.from(String(partner.name || 'partner')).reduce((sum, char) => sum + char.charCodeAt(0), 0);
                const shirtHue = (nameHash * 37) % 360;
                const accentHue = (shirtHue + 45) % 360;

                const svg = `
                <svg width="240" height="240" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="bg" x1="0" y1="0" x2="240" y2="240">
                            <stop offset="0%" stop-color="${theme.top}"/>
                            <stop offset="100%" stop-color="${theme.bottom}"/>
                        </linearGradient>
                        <linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="hsl(${shirtHue}, 70%, 42%)"/>
                            <stop offset="100%" stop-color="hsl(${accentHue}, 65%, 30%)"/>
                        </linearGradient>
                    </defs>
                    <rect width="240" height="240" rx="120" fill="url(#bg)"/>
                    <circle cx="56" cy="58" r="18" fill="#FFFFFF" fill-opacity="0.38"/>
                    <circle cx="176" cy="62" r="12" fill="#FFFFFF" fill-opacity="0.26"/>
                    <circle cx="188" cy="176" r="26" fill="#FFFFFF" fill-opacity="0.18"/>
                    <circle cx="120" cy="88" r="36" fill="#F6C7AD"/>
                    <path d="M92 82C92 60 105 48 120 48C136 48 148 60 148 82V90H92V82Z" fill="#1F2937"/>
                    <circle cx="108" cy="87" r="3.5" fill="#111827"/>
                    <circle cx="132" cy="87" r="3.5" fill="#111827"/>
                    <path d="M108 100C114 106 126 106 132 100" stroke="#C2410C" stroke-width="3" stroke-linecap="round"/>
                    <path d="M70 170C76 144 96 128 120 128C144 128 164 144 170 170V195H70V170Z" fill="url(#shirt)"/>
                    <path d="M92 136L74 168" stroke="#0B1220" stroke-width="14" stroke-linecap="round"/>
                    <path d="M148 136L166 168" stroke="#0B1220" stroke-width="14" stroke-linecap="round"/>
                    <circle cx="120" cy="120" r="20" fill="#F6C7AD"/>
                    <rect x="106" y="116" width="28" height="34" rx="10" fill="#F6C7AD"/>
                    <rect x="104" y="150" width="32" height="42" rx="16" fill="url(#shirt)"/>
                    <text x="120" y="212" text-anchor="middle" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="700" fill="#FFFFFF">${initials}</text>
                </svg>`;

                return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    try {
        const response = await fetch('http://localhost:5000/api/partners');
        const result = await response.json();

        if (response.ok && result.data) {
            renderPartners(result.data);
        } else {
            renderPartners(localFallbackPartners);
        }
    } catch (error) {
        console.error("Error fetching partners:", error);
        renderPartners(localFallbackPartners);
    }
});
