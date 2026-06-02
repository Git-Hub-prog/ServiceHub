let servicesData = []; // Global for homepage search

const dropBtn = document.querySelector('.drop-btn');
if (dropBtn) {
    dropBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const menu = document.querySelector('.drop-content');
        if (menu) menu.classList.toggle('show');
    });
}

// ================= PROFILE DROPDOWN =================
const profileBtn = document.getElementById("profileBtn");
const profileDropdown = document.getElementById("profileDropdown");

if (profileBtn && profileDropdown) {
    profileBtn.addEventListener("click", (e) => {
        e.preventDefault();
        profileDropdown.classList.toggle('show');
    });
}

// Check Login Status and Update UI
function updateProfileUI() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.name && profileBtn) {
        profileBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${user.name.split(' ')[0]} <i class="fas fa-chevron-down" style="font-size: 10px; margin-left: 5px;"></i>`;
        
        // Update dropdown if it exists
        if (profileDropdown) {
            profileDropdown.innerHTML = `
                <a href="profile/dashboard.html"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
                <a href="servicesInfo/review.html"><i class="fas fa-star"></i> My Reviews</a>
                <a href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</a>
            `;

            document.getElementById("logoutBtn").addEventListener("click", (e) => {
                e.preventDefault();
                localStorage.removeItem("user");
                window.location.reload();
            });
        }
    }
}

// ================= SEARCH FUNCTIONALITY =================
function searchServices() {
    const input = document.getElementById("serviceSearch").value.toLowerCase().trim();
    const resultsBox = document.getElementById("searchResults");

    resultsBox.innerHTML = "";

    if (input === "") {
        resultsBox.style.display = "none";
        return;
    }

    if (servicesData.length === 0) return;

    // Flatten servicesData to get all individual services
    let allMatches = [];
    servicesData.forEach(category => {
        category.services.forEach(service => {
            if (service.title.toLowerCase().includes(input) || 
                service.description.toLowerCase().includes(input) ||
                category.categoryTitle.toLowerCase().includes(input)) {
                allMatches.push({
                    ...service,
                    categoryTitle: category.categoryTitle
                });
            }
        });
    });

    if (allMatches.length === 0) {
        resultsBox.style.display = "block";
        resultsBox.innerHTML = `<div class="result-item">No service found</div>`;
        return;
    }

    // Show top 5 matches
    allMatches.slice(0, 5).forEach(match => {
        const div = document.createElement("div");
        div.className = "result-item";
        
        // Root-relative path
        let imgPath = match.image;
        if (imgPath.startsWith('../')) {
            imgPath = imgPath.replace('../', '');
        }

        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${imgPath}" style="width: 40px; height: 40px; border-radius: 5px; object-fit: cover;">
                <div>
                    <div style="font-weight: 600;">${match.title}</div>
                    <div style="font-size: 11px; color: #64748B;">${match.categoryTitle}</div>
                </div>
            </div>
        `;

        div.onclick = () => {
            // Find the categoryId for this match
            const category = servicesData.find(c => c.categoryTitle === match.categoryTitle);
            if (category) {
                window.location.href = `services/service-category.html?category=${category.categoryId}`;
            } else {
                window.location.href = `services/all-services.html?q=${encodeURIComponent(match.title)}`;
            }
        };

        resultsBox.appendChild(div);
    });

    resultsBox.style.display = "block";
}

// ================= AI VIDEO SHOWCASE LOGIC =================
function initVideoShowcase() {
    const stages = document.querySelectorAll('.stage');
    const texts = document.querySelectorAll('.scene-text');
    const progressBar = document.querySelector('.progress-bar');
    let currentScene = 0;
    const sceneDuration = 4000; // 4 seconds per scene

    if (stages.length === 0) return;

    function nextScene() {
        // Remove active class from current elements
        stages[currentScene].classList.remove('active');
        texts[currentScene].classList.remove('active');

        // Increment scene index
        currentScene = (currentScene + 1) % stages.length;

        // Add active class to new elements
        stages[currentScene].classList.add('active');
        texts[currentScene].classList.add('active');

        // Reset and animate progress bar
        resetProgressBar();
    }

    function resetProgressBar() {
        if (!progressBar) return;
        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
        
        // Force reflow
        progressBar.offsetHeight;

        progressBar.style.transition = `linear ${sceneDuration}ms`;
        progressBar.style.width = '100%';
    }

    // Initial progressive bar start
    resetProgressBar();

    // Start loop
    setInterval(nextScene, sceneDuration);
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", async () => {
    initVideoShowcase();
    updateProfileUI();

    // Fetch services for search
    try {
        const response = await fetch('http://localhost:5000/api/services');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        servicesData = await response.json();
    } catch (error) {
        const localData = Array.isArray(window.servicesData) ? window.servicesData : [];
        servicesData = localData;
        if (!localData.length) {
            console.error("Error fetching services for search:", error);
        }
    }
});

// ENTER key redirect to all services page with query
document.getElementById("serviceSearch").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        const query = this.value.trim();
        if (query) {
            window.location.href = `services/all-services.html?q=${encodeURIComponent(query)}`;
        }
    }
});

// ================= CLOSE DROPDOWNS AND SEARCH RESULTS ON OUTSIDE CLICK =================
document.addEventListener("click", (e) => {
    // Close services dropdown
    if (!e.target.closest(".dropdown")) {
        const dropContent = document.querySelector(".drop-content");
        if (dropContent) dropContent.classList.remove("show");
    }

    // Close profile dropdown
    if (!e.target.closest(".profile-menu")) {
        if (profileDropdown) profileDropdown.classList.remove("show");
    }

    // Close search results ONLY if clicking outside search box AND search results
    const searchResults = document.getElementById("searchResults");
    if (searchResults && !e.target.closest(".search-box") && !e.target.closest("#searchResults")) {
        searchResults.style.display = "none";
    }
});


