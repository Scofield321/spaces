// admin-dashboard-router.js
import { loadOverview, loadUsers } from "./admin-dashboard.js";
import { loadAdminVerifications } from "./admin-verification.js";
import { loadDisputes } from "./disputes.js";

export function initAdminRouter() {
  const routes = {
    "#overview": loadOverview,
    "#users": loadUsers,
    "#verification": loadAdminVerifications,
    "#contracts": () => renderPlaceholder("Contracts coming soon..."),
    "#disputes": loadDisputes,
    "#settings": () => renderPlaceholder("Settings page coming soon..."),
  };

  function renderPlaceholder(text) {
    document.getElementById("main-content").innerHTML = `
      <section class="card placeholder">
        <p>${text}</p>
      </section>
    `;
  }

  function router() {
    const hash = window.location.hash || "#overview";
    const pageHandler = routes[hash];

    highlightActiveNav(hash);

    if (pageHandler) {
      pageHandler();
    } else {
      window.location.hash = "#overview";
      loadOverview();
    }
  }

  function highlightActiveNav(hash) {
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === hash);
    });
  }

  // Initial load
  router();

  // Listen to hash changes
  window.addEventListener("hashchange", router);
}
