import { BASE_URL } from "./config.js";
import { Session } from "./session.js";
import { showLoader, hideLoader } from "./loader.js";

// ---------- API Wrapper ----------
async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${Session.token()}`,
  };
  if (!(options.body instanceof FormData)) {
    options.headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, options);
  if (!res.ok)
    throw new Error(
      (await res.json()).message || "Something Wrong Happened, Try Again"
    );
  return res.json();
}

// ---------- Load My Projects ----------
export async function loadMyProjects() {
  const content = document.getElementById("main-content");
  showLoader(); // show loader at start
  try {
    const data = await fetchWithAuth(`${BASE_URL}/freelancer/my-projects`);

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
    content.innerHTML = "<p>Error loading projects.</p>";
  } finally {
    hideLoader(); // hide loader after API finishes
  }
}
