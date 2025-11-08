import { loadFreelancerDashboard } from "./freelancer-dashboard.js";

import { loadFreelancerProfile } from "./freelancer-profile.js";
import { loadContracts } from "./freelancer-contracts.js";
import { loadFreelancerInvites } from "./freelancer-invites.js";
import { loadMyProjects } from "./freelancer-projects.js";
import { loadAssignedProjects } from "./freelancer-assigned-projects.js";
import { loadFreelancerVerification } from "./freelancer-verification.js";
import { loadDisputes } from "./disputes.js";
import { loadNotifications } from "./freelancer-notifications.js";
import { loadFreelancerApplications } from "./freelancer-applications.js";

export function initFreelancerRouter() {
  const navLinks = document.querySelectorAll(".nav-link");

  function setActive(view) {
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.view === view);
    });
  }

  function loadView(view) {
    switch (view) {
      case "find-work":
        loadFreelancerDashboard();
        break;
      case "my-projects":
        loadMyProjects();
        break;
      case "contracts":
        loadContracts();
        break;
      case "assigned-projects":
        loadAssignedProjects();
        break;
      case "invites":
        loadFreelancerInvites();
        break;
      case "verification":
        loadFreelancerVerification();
        break;
      case "notifications":
        loadNotifications();
        break;
      case "disputes":
        loadDisputes();
        break;
      case "profile":
        loadFreelancerProfile();
        break;
      case "applications":
        loadFreelancerApplications();
        break;
      case "home":
        loadFreelancerDashboard(); // default home is Find Work
        break;
      default:
        loadFreelancerDashboard();
    }
  }

  // Sidebar nav links
  navLinks.forEach((link) => {
    link.onclick = (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      setActive(view);
      loadView(view);
    };
  });

  // Delegated click listener for dynamically created links
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view]");
    if (!link) return;

    e.preventDefault();
    const view = link.dataset.view;

    setActive(view); // highlight sidebar if exists
    loadView(view);
  });

  // Initial load
  const activeLink = document.querySelector(".nav-link.active");
  const initialView = activeLink ? activeLink.dataset.view : "home";
  loadView(initialView);
}
