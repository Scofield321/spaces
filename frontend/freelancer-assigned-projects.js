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
  if (!res.ok)
    throw new Error(
      (await res.json()).message || "Something Wrong Happened, Try Again"
    );
  return res.json();
}

// ---------- Load Assigned Projects ----------
export async function loadAssignedProjects() {
  try {
    const data = await fetchWithAuth(
      `${BASE_URL}/freelancer/assigned-projects`
    );
    const content = document.getElementById("main-content");

    if (data.projects.length === 0) {
      content.innerHTML = "<p>No assigned projects yet.</p>";
      return;
    }

    content.innerHTML = `
      <section class="card">
        <h3>Assigned Projects</h3>
        <div class="results-grid">
        ${data.projects
          .map(
            (p) => `
              <div class="card assigned-project-card">
                <h4>${p.title}</h4>
                <p>About Project: ${p.description}</p>
                <p>Client: ${p.client_name} 
                  ${
                    p.client_verified
                      ? `<span class="verified-wrapper">
                          <svg class="verified-icon" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" fill="#1DA1F2"></circle>
                            <path d="M17 9l-6.5 6L7 11.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </span>`
                      : ""
                  }
                </p>

                <p>Budget: ${p.budget_text || "$" + p.budget} | Status: ${
              p.status
            }</p>
        
                <div class="project-actions">
                  ${
                    p.status === "accepted"
                      ? `<span class="btn btn-secondary" disabled>Already Accepted</span>`
                      : `<button class="btn btn-success accept-btn" data-project-id="${p.id}">Accept</button>`
                  }
                  <button class="btn btn-danger decline-btn" data-project-id="${
                    p.id
                  }">Decline</button>
                </div>
              </div>`
          )
          .join("")}
        </div>
      </section>
    `;

    // Toast notification helper
    function showToast(message, type = "success") {
      const toast = document.createElement("div");
      toast.className = `toast ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    // Accept project
    document.querySelectorAll(".accept-btn").forEach((btn) => {
      btn.onclick = async () => {
        const projectId = btn.dataset.projectId;
        try {
          await fetchWithAuth(`${BASE_URL}/freelancer/accept-project`, {
            method: "POST",
            body: JSON.stringify({ projectId }),
          });
          showToast("Project accepted. Client will be notified.");
          loadAssignedProjects(); // refresh to disable button
        } catch (err) {
          console.error(err);
          showToast("Failed to accept project.", "error");
        }
      };
    });

    // Decline project
    document.querySelectorAll(".decline-btn").forEach((btn) => {
      btn.onclick = () => {
        const projectId = btn.dataset.projectId;

        const modal = document.createElement("div");
        modal.className = "modal-overlay";
        modal.innerHTML = `
          <div class="modal-content">
            <span class="modal-close">&times;</span>
            <h3>Decline Project</h3>
            <p>Please enter the reason for declining this project:</p>
            <textarea id="decline-reason" class="input textarea" placeholder="Enter reason..."></textarea>
            <div style="display:flex; justify-content: flex-end; gap: 0.5rem; margin-top:1rem;">
              <button id="cancel-btn" class="btn btn-secondary">Cancel</button>
              <button id="submit-btn" class="btn btn-danger">Decline</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector(".modal-close").onclick = () => modal.remove();
        modal.querySelector("#cancel-btn").onclick = () => modal.remove();
        modal.onclick = (e) => {
          if (e.target === modal) modal.remove();
        };

        modal.querySelector("#submit-btn").onclick = async () => {
          const reason = document.getElementById("decline-reason").value.trim();
          if (!reason) return showToast("Decline reason required.", "error");

          try {
            await fetchWithAuth(`${BASE_URL}/freelancer/decline-project`, {
              method: "POST",
              body: JSON.stringify({ projectId, reason }),
            });
            showToast("You declined this project.", "success");
            modal.remove();
            loadAssignedProjects();
          } catch (err) {
            console.error(err);
            showToast("Failed to decline project.", "error");
          }
        };
      };
    });
  } catch (err) {
    console.error("Error loading assigned projects:", err);
    document.getElementById("main-content").innerHTML =
      "<p>Error loading assigned projects.</p>";
  }
}
