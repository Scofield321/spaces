import { loadClientHome } from "./client-dashboard-home.js";
import { loadClientApplications } from "./client-applications.js";
import {
  loadNotifications,
  fetchAndUpdateUnreadNotifications,
} from "./client-notifications.js";
import { loadSearchFreelancers } from "./client-search.js";
import { loadContracts } from "./client-contracts.js";
import { loadPayments } from "./client-payments.js";
import { loadManageProjects } from "./client-projects.js";
import { loadClientInvites } from "./client-invites.js";
import { loadClientVerification } from "./client-verification.js";
import { loadClientProfile } from "./client-profile.js";
import { loadDisputes } from "./disputes.js";

export function initClientRouter() {
  const links = document.querySelectorAll(".nav-link");

  const viewMap = {
    home: loadClientHome,
    "search-freelancers": loadSearchFreelancers,
    contracts: loadContracts,
    "manage-projects": loadManageProjects,
    applications: loadClientApplications,
    invitations: loadClientInvites,
    notifications: loadNotifications,
    payments: loadPayments,
    verification: loadClientVerification,
    disputes: loadDisputes,
    profile: loadClientProfile,
  };

  // ✅ Fetch unread notifications immediately on dashboard load
  fetchAndUpdateUnreadNotifications();

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const view = link.dataset.view;

      links.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      const loader = viewMap[view] || loadClientHome;
      loader();

      // ✅ Refresh notification badge on each tab switch
      fetchAndUpdateUnreadNotifications();
    });
  });

  // ✅ default load
  document.querySelector(".nav-link.active")?.click();

  // ✅ Handle dynamic dashboard buttons (like Post Project, Applications, Notifications)
  document.addEventListener("click", (e) => {
    const view = e.target.closest("[data-view]")?.dataset?.view;
    const postProject = e.target.id === "postProjectBtn";

    if (!view && !postProject) return;

    // Handle "Post Project" button
    if (postProject) {
      const manageProjectsFn = viewMap["manage-projects"];
      if (manageProjectsFn) manageProjectsFn();
      return;
    }

    // Handle any [data-view] button (outside sidebar)
    const loader = viewMap[view];
    if (loader) {
      loader();

      // ✅ Refresh notification badge too
      fetchAndUpdateUnreadNotifications();

      // Optional: highlight sidebar tab if exists
      document.querySelectorAll(".nav-link").forEach((l) => {
        l.classList.toggle("active", l.dataset.view === view);
      });
    }
  });
}
