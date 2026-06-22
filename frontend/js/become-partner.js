document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector(".partner-form");
    const API_BASE_URL = "http://localhost:5000";
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    const toastStack = document.createElement("div");
    toastStack.className = "toast-stack";
    document.body.appendChild(toastStack);

    const showToast = (type, title, message, duration = 3200) => {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        `;
        toastStack.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("hide");
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    const normalizePhone = (value) => {
        const digits = String(value || "").replace(/\D/g, "");
        if (digits.length > 10) return digits.slice(-10);
        return digits;
    };

    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById("name").value.trim(),
            email: document.getElementById("email").value.trim(),
            phone: normalizePhone(document.getElementById("phone").value),
            service: document.getElementById("service").value,
            preferredShift: document.getElementById("shift").value,
            experience: parseInt(document.getElementById("experience").value),
            address: document.getElementById("address").value.trim()
        };

        // Basic validation
        if (!formData.name || !formData.email || !formData.phone || !formData.service || isNaN(formData.experience) || !formData.address) {
            showToast("info", "Check Details", "Please fill all fields correctly before submitting.");
            return;
        }

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Submitting...";
            }

            const response = await fetch(`${API_BASE_URL}/api/partners`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            let data = {};
            try {
                data = await response.json();
            } catch (parseError) {
                data = { message: "Invalid server response" };
            }

            if (response.ok) {
                // Joyful confetti effect
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#2563eb', '#10b981', '#f59e0b']
                });
                showToast("success", "Success", "Partner registration completed successfully!");

                if (data && data.data && data.data._id) {
                    localStorage.setItem('newPartnerId', String(data.data._id));
                    localStorage.setItem('newPartnerName', String(data.data.name || ''));
                }

                // Redirect quickly after seeing the joy!
                setTimeout(() => {
                    window.location.href = "partners.html";
                }, 1500);
            } else {
                showToast("error", "Registration Blocked", data.message || "Registration failed");
            }
        } catch (error) {
            console.error("Error:", error);
            showToast("error", "Server Error", "Please make sure backend is running at http://localhost:5000");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Register as Partner";
            }
        }
    });
});
