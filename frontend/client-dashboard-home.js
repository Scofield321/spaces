import { BASE_URL } from "./config.js";
import { Session } from "./session.js";
import { showLoader, hideLoader } from "./loader.js";

// ---------- API Helper ----------
export async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    Authorization: `Bearer ${Session.token()}`,
  };

  showLoader();
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error((await res.json()).message || "API Error");
    return res.json();
  } finally {
    hideLoader();
  }
}

// ---------- Helpers ----------
function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString();
}

function skeletonLoader() {
  return `
    <div class="skeleton skeleton-title"></div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
  `;
}

function categorizeProjects(projects) {
  const categories = { active: 0, pending: 0, completed: 0 };

  projects.forEach((p) => {
    switch (p.status?.toLowerCase()) {
      case "assigned":
      case "accepted":
        categories.active++;
        break;
      case "open":
      case "invitation":
        categories.pending++;
        break;
      case "completed":
        categories.completed++;
        break;
    }
  });

  return categories;
}

// ---------- UI Renderers ----------
function renderStats({ active, pending, completed }) {
  return `
    <section class="stats-grid">
      <div class="stat-card"><h4>${active}</h4><p>Active Projects</p></div>
      <div class="stat-card"><h4>${pending}</h4><p>Pending Projects</p></div>
      <div class="stat-card"><h4>${completed}</h4><p>Completed Projects</p></div>
    </section>
  `;
}

function renderProjects(projects) {
  if (!projects.length) return `<p>No recent projects found.</p>`;

  return projects
    .map((p) => {
      const status = p.status
        ? p.status.charAt(0).toUpperCase() + p.status.slice(1).toLowerCase()
        : "Unknown";

      return `
        <div class="card project-card">
          <div class="project-header">
            <h4>${p.title}</h4>
            <span class="tag ${status.toLowerCase()}">${status}</span>
          </div>
          <p><strong>Budget:</strong> ${
            p.budget_text || formatCurrency(p.budget)
          }</p>
          ${p.category ? `<p><strong>Category:</strong> ${p.category}</p>` : ""}
          ${
            p.description
              ? `<p class="desc">${p.description.substring(0, 100)}...</p>`
              : ""
          }
          <p><strong>Created:</strong> ${formatDate(p.created_at)}</p>
          <p><strong>Assigned to:</strong> ${
            p.freelancer_id
              ? `${p.freelancer_first_name} ${p.freelancer_last_name}`
              : "Not assigned yet"
          }</p>
        </div>
      `;
    })
    .join("");
}

function renderActivity(activities) {
  if (!activities.length) return `<p>No recent activity.</p>`;
  return `
    <ul class="activity-list">
      ${activities.map((a) => `<li><span>•</span> ${a.message}</li>`).join("")}
    </ul>
  `;
}

function renderDashboard({ clientName, stats, projects, activities }) {
  return `
    <section class="card welcome-card">
      <div class="welcome-header">
        <h3>Welcome back, ${clientName}</h3>
        <p>Here’s a quick overview of your recent activity.</p>
        <div class="quick-actions">
          <button class="btn" id="postProjectBtn">+ Post Project</button>
          <button class="btn-outline" data-view="applications">Applications</button>
          <button class="btn-outline" data-view="notifications">Notifications</button>
        </div>
      </div>
    </section>

    ${renderStats(stats)}

    <section class="card">
      <h3>Recent Projects</h3>
      <div class="results-grid">${renderProjects(projects)}</div>
      <a class="link" data-view="manage-projects" id="viewAllProjects">View All Projects →</a>
    </section>

    <section class="card">
      <h3>Recent Activity</h3>
      ${renderActivity(activities)}
      <a class="link" data-view="notifications">View All Activity →</a>
    </section>
  `;
}

// ---------- Main Function ----------
export async function loadClientHome() {
  const content = document.getElementById("main-content");
  content.innerHTML = skeletonLoader();

  try {
    const [projectsRes, notifRes] = await Promise.all([
      fetchWithAuth(`${BASE_URL}/client/my-projects`),
      fetchWithAuth(`${BASE_URL}/client/notifications`),
    ]);

    const projects = projectsRes.projects || [];
    const activities = notifRes.notifications?.slice(0, 5) || [];
    const stats = categorizeProjects(projects);

    const user = Session.user();
    const clientName = user ? `${user.first_name} ${user.last_name}` : "Client";

    content.innerHTML = renderDashboard({
      clientName,
      stats,
      projects,
      activities,
    });
  } catch (err) {
    console.error(err);
    content.innerHTML = `
      <p>Error loading dashboard.</p>
      <button class="btn btn-danger" onclick="loadClientHome()">Retry</button>
    `;
  }
}
