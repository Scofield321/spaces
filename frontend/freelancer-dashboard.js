import { BASE_URL } from "./config.js";
import { Session } from "./session.js";
import { fetchAndUpdateUnreadNotifications } from "./freelancer-notifications.js";

// Toast
function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Fetch with auth
async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    Authorization: `Bearer ${Session.token()}`,
  };
  const res = await fetch(url, options);
  if (!res.ok) throw new Error((await res.json()).message || "API Error");
  return res.json();
}

// Render Stats
function renderStats({ active, pending, completed }) {
  return `
    <section class="stats-grid">
      <div class="stat-card"><h4>${active}</h4><p>Active Projects</p></div>
      <div class="stat-card"><h4>${pending}</h4><p>Pending Applications</p></div>
      <div class="stat-card"><h4>${completed}</h4><p>Completed Projects</p></div>
    </section>
  `;
}

// Render Jobs
function renderJobs(jobs) {
  if (!jobs.length) return "<p>No available jobs at the moment.</p>";
  return `
    <section class="card search-section">
      <h3>Available Jobs</h3>
      <div class="results-grid">
        ${jobs
          .map(
            (job) => `
          <div class="card job-card" data-id="${job.id}">
            <h4>${job.title}</h4>
            ${
              job.description
                ? `<p class="job-description">${job.description}</p>`
                : ""
            }
            <p>Client: ${job.client_name}</p>
            <p>Budget: ${
              job.budget_text || "$" + job.budget
            } | Status: <span class="status ${job.status}">${
              job.status
            }</span></p>
            <button class="btn apply-btn ${
              job.already_applied ? "applied-btn" : ""
            }" ${job.already_applied ? "disabled" : ""}>
              ${job.already_applied ? "Applied" : "Apply"}
            </button>
          </div>
        `
          )
          .join("")}
      </div>
    </section>
  `;
}

// Render Recent Applications
function renderRecentApplications(applications, limit = 5) {
  if (!applications.length) return "<p>No recent applications.</p>";

  const recentApps = applications.slice(0, limit);

  return `
    <section class="card recent-applications">
      <div class="section-header">
        <h3>Recent Applications</h3>
      </div>
      <ul class="notification-list">
        ${recentApps
          .map(
            (app) => `
          <li class="notification-item">
            <div class="notification-info">
              <h4 class="project-title">${app.project_title}</h4>
              <p>Status: <span class="status ${app.status}">${
              app.status
            }</span></p>
              <small>Applied on: ${new Date(
                app.applied_on
              ).toLocaleDateString()}</small>
            </div>
          </li>
        `
          )
          .join("")}
      </ul>
      ${
        applications.length > limit
          ? `<a class="link" data-view="applications">View All Applications →</a>`
          : ""
      }
    </section>
  `;
}

function renderNotifications(notifs, limit = 5) {
  if (!notifs.length) return "<p>No notifications.</p>";

  const recentNotifs = notifs.slice(0, limit);

  return `
    <section class="card recent-notifications">
      <div class="section-header">
        <h3>Recent Notifications</h3>
      </div>
      <ul class="notification-list">
        ${recentNotifs
          .map(
            (n) => `
          <li class="notification-item ${n.read ? "read" : "unread"}">
            <div class="notification-info">
              <p>${n.message}</p>
              <small>${new Date(n.created_at).toLocaleString()}</small>
            </div>
          </li>
        `
          )
          .join("")}
      </ul>
      ${
        notifs.length > limit
          ? `<a class="link" data-view="notifications">View All Notifications →</a>`
          : ""
      }
    </section>
  `;
}

// Apply buttons
function attachApplyEvents() {
  document.querySelectorAll(".apply-btn").forEach((btn) => {
    btn.onclick = async (e) => {
      const jobCard = e.target.closest(".job-card");
      const projectId = jobCard.dataset.id;
      const button = e.target;

      button.textContent = "Applied";
      button.disabled = true;
      button.classList.add("applied-btn");

      try {
        await fetchWithAuth(`${BASE_URL}/freelancer/apply`, {
          method: "POST",
          body: JSON.stringify({ projectId }),
        });
        showToast("Application submitted ✅");
      } catch (err) {
        button.textContent = "Apply";
        button.disabled = false;
        button.classList.remove("applied-btn");
        showToast(err.message);
      }
    };
  });
}

// Load Freelancer Dashboard
export async function loadFreelancerDashboard() {
  const content = document.getElementById("main-content");
  content.innerHTML = "<p>Loading your dashboard...</p>";

  try {
    const [jobsRes, statsRes, recentAppsRes, notifsRes] = await Promise.all([
      fetchWithAuth(`${BASE_URL}/freelancer/jobs`),
      fetchWithAuth(`${BASE_URL}/freelancer/stats`),
      fetchWithAuth(`${BASE_URL}/freelancer/recent-applications`),
      fetchWithAuth(`${BASE_URL}/freelancer/notifications?limit=5`),
    ]);

    content.innerHTML = `
      <section class="card welcome-card">
        <h3>Welcome back, ${Session.user().first_name}!</h3>
        <p>Here's your activity snapshot and opportunities.</p>
      </section>

      ${renderStats(statsRes)}
      ${renderJobs(jobsRes.jobs)}
      ${renderRecentApplications(recentAppsRes.applications)}
      ${renderNotifications(notifsRes.notifications)}
    `;

    attachApplyEvents();
  } catch (err) {
    console.error(err);
    content.innerHTML = "<p>Error loading dashboard.</p>";
  }
}

// notifications load
document.addEventListener("DOMContentLoaded", () => {
  fetchAndUpdateUnreadNotifications();
});
