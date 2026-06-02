document.addEventListener("DOMContentLoaded", function () {
    const API_BASE_URL = "http://localhost:5000";
    const serviceInput = document.getElementById("service");
    const priceInput = document.getElementById("price");

    const serviceName = localStorage.getItem("serviceName") || "";
    const servicePrice = localStorage.getItem("servicePrice") || "";
    const allowedTimeSlots = [
        "6:00 AM - 7:00 AM",
        "7:00 AM - 8:00 AM",
        "8:00 AM - 9:00 AM",
        "9:00 AM - 10:00 AM",
        "10:00 AM - 11:00 AM",
        "11:00 AM - 12:00 PM",
        "2:00 PM - 3:00 PM",
        "3:00 PM - 4:00 PM",
        "4:00 PM - 5:00 PM",
        "5:00 PM - 6:00 PM"
    ];

    function isWorkerAvailable(service, slot) {
        const unavailableSlotsByService = {
            "Flush Tank Repair": ["6:00 AM - 7:00 AM", "2:00 PM - 3:00 PM"],
            "Motor Installation": ["7:00 AM - 8:00 AM", "4:00 PM - 5:00 PM"],
            "Leakage Repair": ["9:00 AM - 10:00 AM"],
            "Tap Installation": ["10:00 AM - 11:00 AM"],
            "Shower Installation": ["11:00 AM - 12:00 PM"],
            "Clog Removal": ["3:00 PM - 4:00 PM"]
        };

        const blockedSlots = unavailableSlotsByService[service] || [];
        return !blockedSlots.includes(slot);
    }

    if (serviceInput && priceInput) {
        serviceInput.value = serviceName;
        priceInput.value = "Rs " + servicePrice;
    }

    const form = document.getElementById("bookingForm");
    if (form) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();

            const allowedLocations = [
                "Alkapuri", "Raopura", "Sayajiganj", "Fatehgunj", "Manjalpur",
                "Akota", "Karelibaug", "Subhanpura", "Gotri", "Ajwa Road"
            ];
            const selectedLocation = document.getElementById("location").value;
            if (!allowedLocations.includes(selectedLocation)) {
                showLocationPopup("Service is not available for this location");
                return;
            }

            const selectedTime = document.getElementById("servingTime").value;
            if (!allowedTimeSlots.includes(selectedTime)) {
                showLocationPopup("Please select a valid time duration");
                return;
            }

            if (!isWorkerAvailable(serviceName, selectedTime)) {
                showLocationPopup("Worker is not free for this time duration. Please check for other time duration.");
                return;
            }

            const user = JSON.parse(localStorage.getItem("user"));
            if (!user || !user.token) {
                alert("Please login to book a service!");
                window.location.href = "../profile/login.html";
                return;
            }

            const bookingData = {
                serviceName: serviceName,
                price: Number(servicePrice),
                customerName: document.getElementById("name").value,
                customerPhone: document.getElementById("phone").value,
                address: document.getElementById("address").value,
                bookingDate: document.getElementById("date").value,
                servingTime: selectedTime,
                location: selectedLocation,
                shift: document.getElementById("shift").value,
                landmark: document.getElementById("landmark").value
            };

            const submitBtn = form.querySelector("button[type='submit']");
            if (submitBtn) submitBtn.disabled = true;

            try {
                const createBookingWithoutPayment = async () => {
                    const directResp = await fetch(`${API_BASE_URL}/api/bookings`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${user.token}`
                        },
                        body: JSON.stringify(bookingData)
                    });

                    const directData = await directResp.json();
                    if (!directResp.ok) {
                        throw new Error(directData.message || "Booking failed");
                    }

                    const msgBox = document.getElementById("msg");
                    msgBox.innerHTML = "<span style='color:#10B981;font-weight:600;'>Booking confirmed. Redirecting...</span>";
                    form.reset();
                    setTimeout(() => {
                        window.location.href = "../your-booking/mybooking.html";
                    }, 1500);
                };

                const orderResp = await fetch(`${API_BASE_URL}/api/bookings/create-order`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${user.token}`
                    },
                    body: JSON.stringify({ amount: Number(servicePrice) })
                });

                const orderData = await orderResp.json();
                if (!orderResp.ok) {
                    const msg = String(orderData.message || "");
                    const paymentConfigIssue =
                        msg.toLowerCase().includes("authentication failed") ||
                        msg.toLowerCase().includes("razorpay keys") ||
                        msg.toLowerCase().includes("failed to create razorpay order");

                    if (paymentConfigIssue) {
                        await createBookingWithoutPayment();
                        return;
                    }

                    throw new Error(orderData.message || "Unable to start payment");
                }

                if (!window.Razorpay) {
                    throw new Error("Razorpay SDK not loaded.");
                }

                const options = {
                    key: orderData.key,
                    amount: orderData.amount,
                    currency: orderData.currency || "INR",
                    name: "ServiceHub",
                    description: `${serviceName} booking payment`,
                    order_id: orderData.orderId,
                    prefill: {
                        name: bookingData.customerName,
                        contact: bookingData.customerPhone
                    },
                    theme: { color: "#2563eb" },
                    handler: async function (paymentResponse) {
                        try {
                            const verifyResp = await fetch(`${API_BASE_URL}/api/bookings/verify-payment`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${user.token}`
                                },
                                body: JSON.stringify({
                                    ...paymentResponse,
                                    bookingData
                                })
                            });

                            const verifyData = await verifyResp.json();
                            if (!verifyResp.ok) {
                                throw new Error(verifyData.message || "Payment verification failed");
                            }

                            const msgBox = document.getElementById("msg");
                            msgBox.innerHTML = "<span style='color:#10B981;font-weight:600;'>Payment successful. Booking confirmed. Redirecting...</span>";
                            form.reset();
                            setTimeout(() => {
                                window.location.href = "../your-booking/mybooking.html";
                            }, 1500);
                        } catch (err) {
                            alert(err.message || "Payment done, but booking confirmation failed.");
                            if (submitBtn) submitBtn.disabled = false;
                        }
                    },
                    modal: {
                        ondismiss: function () {
                            if (submitBtn) submitBtn.disabled = false;
                        }
                    }
                };

                const rzp = new Razorpay(options);
                rzp.on("payment.failed", function (response) {
                    alert(response.error?.description || "Payment failed. Please retry.");
                    if (submitBtn) submitBtn.disabled = false;
                });
                rzp.open();
            } catch (error) {
                console.error("Error:", error);
                alert(error.message || "Server error, please try again later.");
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    function showLocationPopup(message) {
        if (document.getElementById("loc-popup")) return;
        const overlay = document.createElement("div");
        overlay.id = "loc-popup";
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.background = "rgba(0,0,0,0.35)";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.zIndex = "9999";

        const box = document.createElement("div");
        box.style.background = "#fff";
        box.style.padding = "20px 22px";
        box.style.borderRadius = "10px";
        box.style.boxShadow = "0 12px 30px rgba(2,6,23,0.2)";
        box.style.maxWidth = "360px";
        box.style.textAlign = "center";

        const msg = document.createElement("p");
        msg.style.margin = "0 0 12px";
        msg.style.fontWeight = "600";
        msg.textContent = message;

        const btn = document.createElement("button");
        btn.textContent = "OK";
        btn.style.padding = "8px 14px";
        btn.style.border = "none";
        btn.style.borderRadius = "8px";
        btn.style.background = "linear-gradient(90deg,#fb7185,#fb923c)";
        btn.style.color = "#fff";
        btn.style.cursor = "pointer";

        btn.addEventListener("click", () => {
            document.body.removeChild(overlay);
        });

        box.appendChild(msg);
        box.appendChild(btn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }
});

(function () {
    const card = document.getElementById("tiltCard");
    if (!card) return;

    const limit = 12;
    const rect = () => card.getBoundingClientRect();

    function onMove(e) {
        const r = rect();
        const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        const rx = (-y * limit).toFixed(2);
        const ry = (x * limit).toFixed(2);
        card.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
    }

    function onLeave() {
        card.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    }

    window.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
    card.addEventListener("touchend", onLeave);
})();
