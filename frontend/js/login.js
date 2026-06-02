const loginForm = document.getElementById("loginForm");
const loginCard = document.getElementById("loginCard");
const loginButton = loginForm ? loginForm.querySelector(".btn") : null;

if (loginCard) {
    loginCard.addEventListener("mousemove", (event) => {
        const rect = loginCard.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const rotateY = ((x / rect.width) - 0.5) * 10;
        const rotateX = ((y / rect.height) - 0.5) * -10;
        loginCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
    });

    loginCard.addEventListener("mouseleave", () => {
        loginCard.style.transform = "rotateX(0deg) rotateY(0deg)";
    });
}

loginForm.addEventListener("submit", async function(e){
    e.preventDefault();

    let email = document.getElementById("email").value.trim();
    let password = document.getElementById("password").value.trim();

    if(email === "" || password === ""){
        alert("Please fill all fields!");
        return;
    }

    try {
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "Logging in...";
        }

        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("user", JSON.stringify(data));
            alert("Login Successful!");
            if (data.role === "admin") {
                window.location.href = "/frontend/admin/dashboard.html";
            } else if (data.role === "partner") {
                try {
                    const meResp = await fetch("http://localhost:5000/api/partner/plumber/me", {
                        headers: { Authorization: `Bearer ${data.token}` }
                    });
                    if (meResp.ok) {
                        window.location.href = "/frontend/plumber/dashboard.html";
                        return;
                    }
                } catch (e) {
                    console.warn("Plumber check failed:", e);
                }
                window.location.href = "/frontend/index.html";
            } else {
                window.location.href = "/frontend/index.html";
            }
        } else {
            alert(data.message || "Login failed!");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Server error, please try again later.");
    } finally {
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = "Login";
        }
    }
});

