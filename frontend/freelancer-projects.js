import { BASE_URL } from "./config.js";
import { Session } from "./session.js";

// Helper
async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${Session.token()}`,
  };
  if (!(options.body instanceof FormData)) {
    options.headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, options);
  if (!res.ok) throw new Error((await res.json()).message || "API Error");
  return res.json();
}

// ---------- Load My Projects ----------
export async function loadMyProjects() {
  try {
    const data = await fetchWithAuth(`${BASE_URL}/freelancer/my-projects`);
    const content = document.getElementById("main-content");

    if (data.contracts.length === 0) {
      content.innerHTML = "<p>You have no projects yet.</p>";
      return;
    }

    content.innerHTML = `
      <section class="card">
        <h3>My Projects</h3>
        <div class="results-grid">
          ${data.contracts
            .map(
              (c) => `
            <div class="card project-card">
              <h4>${c.project_title}</h4>
              <p>Client: ${c.client_name}</p>
              <p>Budget: ${c.budget_text || "$" + c.budget} | Status: ${
                c.status
              }</p>
            </div>`
            )
            .join("")}
        </div>
      </section>
    `;
  } catch (err) {
    console.error("Error loading projects:", err);
    document.getElementById("main-content").innerHTML =
      "<p>Error loading projects.</p>";
  }
}
