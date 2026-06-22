// Get DOM elements
const container = document.getElementById("dynamic-services-container");
const searchInput = document.getElementById("serviceSearch");

// Global services data
let servicesData = [];

// Render all services in the container
function renderServices(data) {
    if (!container) return;
    container.innerHTML = "";
    
    if (!data || data.length === 0) {
        container.innerHTML = "<div class='no-results'><h2>No services found</h2></div>";
        return;
    }
    
    data.forEach((category) => {
        if (!category.services || category.services.length === 0) return;
        
        const section = document.createElement("section");
        section.className = "service-section";
        
        const h2 = document.createElement("h2");
        h2.className = "section-title";
        h2.textContent = category.categoryTitle || category.title || "Services";
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

// Add booking event listeners
function attachBookingHandlers() {
    document.querySelectorAll(".book-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const service = e.target.getAttribute("data-service");
            const price = e.target.getAttribute("data-price");
            localStorage.setItem("serviceName", service);
            localStorage.setItem("servicePrice", price);
            window.location.href = "/frontend/booking-details/booking.html";
        });
    });
}

// Search functionality
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            renderServices(servicesData);
            return;
        }
        
        const filtered = servicesData.map((cat) => ({
            ...cat,
            services: cat.services.filter((svc) => 
                svc.title.toLowerCase().includes(query) || 
                svc.description.toLowerCase().includes(query)
            )
        })).filter((cat) => cat.services.length > 0);
        
        renderServices(filtered);
    });
}

// Load and render services
async function loadAndRender() {
    try {
        // Try API first
        const response = await fetch("http://localhost:5000/api/services");
        if (response.ok) {
            servicesData = await response.json();
        } else {
            // Fallback to local data
            servicesData = window.servicesData || [];
        }
    } catch (err) {
        // Fallback to local data on error
        servicesData = window.servicesData || [];
    }
    
    if (servicesData.length > 0) {
        renderServices(servicesData);
    }
}

// Start on page ready
loadAndRender();
