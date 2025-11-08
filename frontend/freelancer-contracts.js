// freelancer-contracts.js
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

/* ================= Format Helpers ================= */
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
  return map[status?.toLowerCase()] || status;
}

/* ================= Load Freelancer Contracts ================= */
export async function loadContracts() {
  try {
    const content = document.getElementById("main-content");
    content.innerHTML = `
      <section class="card">
        <h3>My Contracts</h3>
        <div class="results-grid" id="contracts-results"></div>
      </section>
    `;

    const container = document.getElementById("contracts-results");
    const data = await fetchWithAuth(`${BASE_URL}/contracts`);

    if (!data.contracts.length) {
      container.innerHTML = `<p>No contracts yet.</p>`;
      return;
    }

    container.innerHTML = data.contracts
      .map(
        (c) => `
        <div class="card contract-card">
          <h4>${c.project_title || "-"}</h4>
          <p><strong>About Project:</strong> ${c.project_description || "-"}</p>
          <p><strong>Client:</strong> ${c.client_name || "-"}</p>
          <p><strong>Amount:</strong> $${c.amount}</p>
          <p><strong>Type:</strong> ${c.type || "-"}</p>
          <p><strong>Start Date:</strong> ${formatDate(c.start_date)}</p>
          <p><strong>Duration:</strong> ${c.expected_duration || "-"}</p>
          <p><strong>Status:</strong> ${formatStatus(c.status)}</p>
          <button class="btn btn-sm btn-secondary view-contract-btn" data-id="${
            c.id
          }">View Contract</button>
        </div>
      `
      )
      .join("");

    // Attach click events
    document.querySelectorAll(".view-contract-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        try {
          const res = await fetchWithAuth(`${BASE_URL}/contracts/${id}`);
          openContractModal(res.contract);
        } catch (err) {
          console.error(err);
          alert("Failed to load contract details");
        }
      });
    });
  } catch (err) {
    console.error(err);
    document.getElementById(
      "main-content"
    ).innerHTML = `<p>Error loading contracts</p>`;
  }
}

/* ================= Modal ================= */
function openContractModal(contract) {
  const oldModal = document.querySelector(".modal-overlay");
  if (oldModal) oldModal.remove();

  function formatDateSafe(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const modal = document.createElement("div");
  modal.classList.add("modal-overlay");
  modal.innerHTML = `
    <div class="modal contract-modal">
      <button class="modal-close">&times;</button>

      <!-- Header -->
      <div class="contract-header">
        <h2>${contract.project_title || "Contract"}</h2>
        ${
          contract.project_description
            ? `<p class="project-description">${contract.project_description}</p>`
            : ""
        }
        <p><strong>Status:</strong> ${formatStatus(contract.status)}</p>
      </div>

      <!-- Freelancer / Client Info -->
      <div class="contract-info">
      <p>
      <strong>Freelancer:</strong> ${contract.freelancer_name || "-"} 
      ${
        contract.freelancer_email
          ? `<a href="mailto:${contract.freelancer_email}" class="email">${contract.freelancer_email}</a>`
          : ""
      }
    </p>
    <p>
    <strong>Client:</strong> ${contract.client_name || "-"} 
    ${
      contract.client_email
        ? `<a href="mailto:${contract.client_email}" class="email">${contract.client_email}</a>`
        : ""
    }
  </p>
      </div>

      <!-- Contract Details -->
      <div class="contract-details">
        <p><strong>Amount:</strong> $${contract.amount}</p>
        <p><strong>Type:</strong> ${contract.type || "-"}</p>
        <p><strong>Start Date:</strong> ${formatDateSafe(
          contract.start_date
        )}</p>
        <p><strong>Duration:</strong> ${contract.expected_duration || "-"}</p>
      </div>

      <hr />

      <!-- Work Scope -->
      <div class="contract-section">
        <h4>Work Scope</h4>
        <p>${contract.work_scope || "-"}</p>
      </div>

      <!-- Milestones -->
      ${
        contract.milestones && contract.milestones.length
          ? `<div class="contract-section">
               <h4>Milestones</h4>
               <ul>
                 ${contract.milestones
                   .map(
                     (m, i) =>
                       `<li>${i + 1}. ${m.title || "-"} - $${m.amount || "-"}${
                         m.due_date ? ` (${formatDateSafe(m.due_date)})` : ""
                       }</li>`
                   )
                   .join("")}
               </ul>
             </div>`
          : ""
      }

      <!-- Payment Terms -->
      ${
        contract.payment_terms && contract.payment_terms.length
          ? `<div class="contract-section">
               <h4>Payment Terms</h4>
               <ul>
                 ${contract.payment_terms
                   .map(
                     (p, i) =>
                       `<li>${i + 1}. ${capitalize(p.type)}: ${
                         p.percentage ? p.percentage + "%" : "-"
                       }</li>`
                   )
                   .join("")}
               </ul>
             </div>`
          : ""
      }

      <hr />
      

      <!-- Actions -->
      <div class="modal-actions">
        ${
          contract.status === "sent"
            ? `<button class="btn btn-success accept-btn">Accept</button>
               <button class="btn btn-danger decline-btn">Decline</button>`
            : ""
        }
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "flex";

  // Close modal
  modal.querySelector(".modal-close").onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  // Accept / Decline buttons
  modal.querySelectorAll(".accept-btn, .decline-btn").forEach((btn) => {
    btn.onclick = async () => {
      const action = btn.classList.contains("accept-btn")
        ? "accept"
        : "decline";
      try {
        await fetchWithAuth(`${BASE_URL}/contracts/${contract.id}/${action}`, {
          method: "PATCH",
        });
        alert(`Contract ${action}ed successfully`);
        modal.remove();
        loadContracts(); // refresh list
      } catch (err) {
        console.error(err);
        alert("Error performing action");
      }
    };
  });
}
