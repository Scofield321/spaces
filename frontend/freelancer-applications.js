import { BASE_URL } from "./config.js";
import { Session } from "./session.js";

/* ================= API Helper ================= */
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

export async function loadFreelancerApplications() {
  const content = document.getElementById("main-content");
  content.innerHTML = "<p>Loading all applications...</p>";

  try {
    const data = await fetchWithAuth(
      `${BASE_URL}/freelancer/recent-applications?all=true`
    );
    const applications = data.applications || [];

    if (!applications.length) {
      content.innerHTML = "<p>No applications yet.</p>";
      return;
    }

    content.innerHTML = `
      <section class="card all-applications">
        <h3>All Applications</h3>
        <ul>
          ${applications
            .map(
              (app) => `
            <li>
              ${app.project_title} — <span class="status ${app.status}">${
                app.status
              }</span>
              | Applied on: ${new Date(app.applied_on).toLocaleDateString()}
            </li>
          `
            )
            .join("")}
        </ul>
      </section>
    `;
  } catch (err) {
    console.error(err);
    content.innerHTML = "<p>Error loading applications.</p>";
  }
}
