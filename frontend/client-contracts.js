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
    if (!res.ok)
      throw new Error(
        (await res.json()).msg || "Something Wrong Happened, Try Again"
      );
    return res.json();
  } finally {
    hideLoader();
  }
}

// ---------- Helpers ----------
function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStatus(status) {
  const map = {
    sent: "📤 Sent",
    draft: "📝 Draft",
    pending: "⏳ Pending",
    accepted: "✅ Accepted",
    closed: "❌ Closed",
  };
  return map[status?.toLowerCase()] || status || "-";
}

// ---------- Main Loader ----------
export async function loadContracts() {
  const content = document.getElementById("main-content");
  content.innerHTML = `<p>Loading contracts...</p>`;

  try {
    const data = await fetchWithAuth(`${BASE_URL}/contracts`);
    const contracts = data.contracts || [];

    content.innerHTML = `
      <section class="card">
        <h3>My Contracts</h3>
        <div class="results-grid" id="contracts-results">
          ${
            contracts.length
              ? contracts
                  .map(
                    (c) => `
            <div class="card contract-card">
              <h4>${c.project_title || "-"}</h4>
              <p><strong>Freelancer:</strong> ${c.freelancer_name || "-"}</p>
              <p><strong>Email:</strong> ${c.freelancer_email || "-"}</p>
              <p><strong>Amount:</strong> $${c.amount || "-"}</p>
              <p><strong>Type:</strong> ${c.type || "-"}</p>
              <p><strong>Start Date:</strong> ${formatDate(c.start_date)}</p>
              <p><strong>Duration:</strong> ${c.expected_duration || "-"}</p>
              <p><strong>Status:</strong> ${formatStatus(c.status)}</p>
              <button class="btn btn-sm btn-outline view-contract-btn" data-id="${
                c.id
              }">View Contract</button>
            </div>
          `
                  )
                  .join("")
              : `<p>No contracts yet.</p>`
          }
        </div>
      </section>
    `;

    // Attach click listeners for "View Contract"
    document.querySelectorAll(".view-contract-btn").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        try {
          const res = await fetchWithAuth(`${BASE_URL}/contracts/${id}`);
          openContractModal(res.contract);
        } catch (err) {
          console.error(err);
          alert("Failed to load contract details");
        }
      };
    });
  } catch (err) {
    console.error(err);
    content.innerHTML = `<p>Error loading contracts</p>`;
  }
}

// ---------- Contract Modal ----------
function openContractModal(contract) {
  const oldModal = document.querySelector(".modal-overlay");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal contract-modal">
      <button class="modal-close">&times;</button>
      
      <div class="modal-header">
        <h2>${contract.project_title || "Contract"}</h2>
        <span class="contract-status">${formatStatus(contract.status)}</span>
      </div>

      <div class="modal-body">
        <div class="contract-info">
          <p><strong>Freelancer:</strong> ${contract.freelancer_name || "-"} ${
    contract.freelancer_email
      ? `<span class="email">&lt;${contract.freelancer_email}&gt;</span>`
      : ""
  }</p>
          <p><strong>Client:</strong> ${Session.user()?.first_name || "You"} ${
    contract.client_email
      ? `<span class="email">&lt;${contract.client_email}&gt;</span>`
      : ""
  }</p>
        </div>

        <div class="contract-details">
          <p><strong>Amount:</strong> $${contract.amount || "-"}</p>
          <p><strong>Type:</strong> ${contract.type || "-"}</p>
          <p><strong>Start Date:</strong> ${formatDate(contract.start_date)}</p>
          <p><strong>Expected Duration:</strong> ${
            contract.expected_duration || "-"
          }</p>
        </div>

        <hr />

        <div class="contract-work">
          <h4>Work Scope / Description</h4>
          <p>${contract.work_scope || "No description provided"}</p>
        </div>

        <hr />

        <div class="contract-milestones">
          <h4>Milestones & Payment Terms</h4>
          <ul>
            ${
              contract.milestones?.length
                ? contract.milestones
                    .map((m) => `<li>${m.title} - $${m.amount}</li>`)
                    .join("")
                : "<li>No milestones defined</li>"
            }
          </ul>
        </div>

        <div class="contract-notice" style="margin-top: 1rem; padding: 0.5rem; background-color: #f0f4f8; border-left: 4px solid #007bff;">
          <p style="margin:0; font-size: 0.9rem; color:#333;">
            For now, coordinate project details directly via email with the other party.
            In-platform messaging will be added in future updates.
          </p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "flex";

  modal.querySelector(".modal-close").onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}
