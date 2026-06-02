function toggleCallMenu() {
    const menu = document.getElementById("callMenu");
    menu.classList.toggle("show");
}

// Close menu when clicking outside
document.addEventListener("click", function (e) {
    const wrapper = document.querySelector(".call-wrapper");
    if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById("callMenu").classList.remove("show");
    }
});
