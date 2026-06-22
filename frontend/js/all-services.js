// Simple and direct initialization
const container = document.getElementById("dynamic-services-container");
const localServices = window.servicesData || [];

function attachBookingHandlers() {
    document.querySelectorAll(".book-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const el = e.currentTarget;
            localStorage.setItem("serviceName", el.getAttribute("data-service"));
            localStorage.setItem("servicePrice", el.getAttribute("data-price"));
            window.location.href = "/frontend/booking-details/booking.html";
        });
    });
}

function renderServices(data) {
    if (!container) return;
    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = "<div class='no-results'><h2>No services found</h2></div>";
        return;
    }

    // If there's only one service across all categories, render a modern detail view
    const allServices = data.reduce((acc, cat) => acc.concat(cat.services || []), []);
    if (allServices.length === 1) {
        const service = allServices[0];
        const category = data.find((c) => (c.services || []).includes(service));

        container.innerHTML = `
            <section class="service-section detail-view">
                <div class="detail-left">
                    <img src="${service.image}" alt="${service.title}">
                </div>
                <div class="detail-center">
                    <div class="kicker">${category ? category.categoryTitle : ''}</div>
                    <h2 class="detail-title">${service.title}</h2>
                    <p class="detail-desc">${service.description}</p>
                    <div class="detail-meta">
                        <span class="price">${service.priceText || ("₹" + service.price)}</span>
                        <button class="book-btn" data-service="${service.title}" data-price="${service.price}">Book Now</button>
                    </div>

                    <div class="includes">
                        <h4>What's included</h4>
                        <ul>
                            <li>Expert technician visit</li>
                            <li>Standard spare parts (if any)</li>
                            <li>Service warranty: 7 days</li>
                        </ul>
                    </div>
                </div>
                <aside class="detail-right">
                    <div class="info-card">
                        <h4>Quick Info</h4>
                        <p><strong>Estimated time:</strong> 60 mins</p>
                        <p><strong>Service type:</strong> On-site</p>
                        <p><strong>Ratings:</strong> 4.6 ★</p>
                    </div>

                    <div class="related-card">
                        <h4>Related services</h4>
                        <ul>
                            ${(category && category.services ? category.services.slice(0,4).filter(s=>s.title!==service.title).map(s=>`<li>${s.title}</li>`).join('') : '')}
                        </ul>
                    </div>
                </aside>
            </section>
        `;

        attachBookingHandlers();
        return;
    }

    // default grid rendering for multiple results
    data.forEach((category) => {
        if (!category.services || category.services.length === 0) return;
        
        const section = document.createElement("section");
        section.className = "service-section";
        
        const h2 = document.createElement("h2");
        h2.className = "section-title";
        h2.textContent = category.categoryTitle || "Services";
        section.appendChild(h2);
        
        const grid = document.createElement("div");
        grid.className = "service-grid";
        
        category.services.forEach((service) => {
            const card = document.createElement("div");
            card.className = "service-card";
            card.innerHTML = `
                <img src="${service.image}" alt="${service.title}">
                <h3>${service.title}</h3>
                <p>${service.description}</p>
                <span class="price">${service.priceText || ("₹" + service.price)}</span>
                <button class="book-btn" data-service="${service.title}" data-price="${service.price}">Book Now</button>
            `;
            grid.appendChild(card);
        });
        
        section.appendChild(grid);
        container.appendChild(section);
    });

    attachBookingHandlers();
}

// initial render
renderServices(localServices);

// Search functionality
const searchInput = document.getElementById("serviceSearch");
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = localServices.map((cat) => ({
            ...cat,
            services: (cat.services || []).filter((s) => 
                s.title.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)
            )
        })).filter((cat) => cat.services.length > 0);

        renderServices(filtered);
    });
}
