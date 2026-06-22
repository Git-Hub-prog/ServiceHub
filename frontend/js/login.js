const loginForm = document.getElementById("loginForm");
const loginButton = loginForm ? loginForm.querySelector(".btn-primary") : null;

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

