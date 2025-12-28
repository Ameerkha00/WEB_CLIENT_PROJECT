const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("sidebarToggleBtn");

function toggleSidebar() {
  sidebar.classList.toggle("closed");
}

function loadPage(page) {
  document.getElementById("contentFrame").src = page;

  // auto-close sidebar on mobile after navigation
  if (window.innerWidth <= 768) {
    sidebar.classList.add("closed");
  }
}

// click outside closes sidebar (ALL screen sizes)
document.addEventListener("click", (e) => {
  if (
    !sidebar.contains(e.target) &&
    !toggleBtn.contains(e.target) &&
    !sidebar.classList.contains("closed")
  ) {
    sidebar.classList.add("closed");
  }
});

// start with sidebar open on desktop, closed on mobile
window.addEventListener("DOMContentLoaded", () => {
  if (window.innerWidth <= 768) {
    sidebar.classList.add("closed");
  } else {
    sidebar.classList.remove("closed");
  }
});
