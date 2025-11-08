import { BASE_URL } from "./config.js";
import { Session } from "./session.js";

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

// ----------- Load Disputes -----------
export async function loadDisputes() {
  const content = document.getElementById("main-content");
  content.innerHTML = `<div class="loading">Loading disputes...</div>`;

  try {
    const { disputes } = await fetchWithAuth(`${BASE_URL}/disputes`);
    const userRole = Session.user()?.role;
    const listHTML = disputes
      .map((d) => disputeCardHTML(d, userRole === "admin"))
      .join("");

    content.innerHTML = `
      <section class="dispute-section">
        <h2>⚖️ Disputes</h2>
        ${
          userRole !== "admin"
            ? `<button class="create-dispute-btn" id="open-create-dispute">Create Dispute</button>`
            : ""
        }
        ${
          disputes.length
            ? listHTML
            : `<div class="empty-disputes"><p>No disputes yet. Raise a new one!</p></div>`
        }
      </section>
    `;

    if (userRole === "admin") {
      attachAdminActions();
      attachAdminManageButtons();
    }

    const createBtn = document.getElementById("open-create-dispute");
    if (createBtn) createBtn.addEventListener("click", openDisputeForm);

    document.querySelectorAll(".toggle-details").forEach((btn) => {
      btn.addEventListener("click", async () =>
        toggleDisputeDetails(btn.dataset.id)
      );
    });
  } catch (err) {
    content.innerHTML = `<p class="error">Failed to load disputes: ${err.message}</p>`;
  }
}

// ----------- Admin action buttons -----------
function attachAdminActions() {
  document.querySelectorAll(".btn-resolve, .btn-reject").forEach((btn) => {
    btn.addEventListener("click", () => {
      const disputeId = btn.dataset.id;
      const status = btn.classList.contains("btn-resolve")
        ? "resolved"
        : "rejected";

      // Find the dispute data from the card
      const card = document.getElementById(`dispute-${disputeId}`);
      const dispute = {
        id: disputeId,
        project_title: card
          .querySelector("h3")
          .textContent.replace("Dispute Title: ", ""),
        description:
          card.querySelector(`#details-${disputeId} p strong`).nextSibling
            ?.textContent || "",
      };

      openResolveModal(dispute, status);
    });
  });
}

// ======== Admin Resolve/Reject Modal ========
function openResolveModal(dispute) {
  const modal = document.createElement("div");
  modal.className = "resolve-modal-backdrop";
  modal.innerHTML = `
    <div class="resolve-modal-content">
      <h3>Resolve Dispute</h3>
      <label>Status</label>
      <select id="resolution-type" required>
        <option value="">--Select Resolution--</option>
        <option value="resolved">Resolved</option>
        <option value="in_progress">In Progress</option>
        <option value="rejected">Rejected</option>
      </select>

      <label>Resolution Notes</label>
      <textarea id="resolution-notes" placeholder="Enter resolution notes"></textarea>

      <div style="margin-top: 10px;">
        <label><input type="checkbox" id="notify-freelancer"> Notify Freelancer</label><br>
        <label><input type="checkbox" id="notify-client"> Notify Client</label>
      </div>

      <div class="modal-actions">
        <button id="confirm-resolution">Confirm</button>
        <button id="cancel-resolution">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#cancel-resolution").onclick = () => modal.remove();

  modal.querySelector("#confirm-resolution").onclick = async () => {
    const typeEl = modal.querySelector("#resolution-type");
    const notesEl = modal.querySelector("#resolution-notes");

    if (!typeEl || !notesEl) {
      alert(
        "Resolution form not loaded properly. Please refresh and try again."
      );
      return;
    }

    const status = typeEl.value;
    const notes = notesEl.value;
    const notifyFreelancer = modal.querySelector("#notify-freelancer").checked;
    const notifyClient = modal.querySelector("#notify-client").checked;

    if (!status) {
      alert("Please select a resolution type.");
      return;
    }

    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/disputes/${dispute.id}/resolve`,
        {
          method: "PUT",
          body: JSON.stringify({
            status,
            resolution: notes,
            notifyFreelancer,
            notifyClient,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to update dispute");
      alert(`Dispute marked as "${status}" successfully!`);
      modal.remove();
      loadDisputes();
    } catch (err) {
      alert(`Failed to update dispute: ${err.message}`);
    }
  };
}

// ----------- Toggle dispute details -----------
async function toggleDisputeDetails(id) {
  const details = document.getElementById(`details-${id}`);
  const evidenceContainer = document.getElementById(`evidence-${id}`);
  const btn = document.querySelector(`.toggle-details[data-id="${id}"]`);

  if (details.style.display === "none") {
    details.style.display = "block";
    btn.textContent = "Hide Details";

    if (!evidenceContainer.dataset.loaded) {
      try {
        const { evidence } = await fetchWithAuth(
          `${BASE_URL}/disputes/${id}/evidence`
        );
        evidenceContainer.innerHTML = !evidence.length
          ? `<p>No evidence uploaded.</p>`
          : `<div class="evidence-grid">${evidence
              .map((ev) => renderEvidence(ev.file_url))
              .join("")}</div>`;
        evidenceContainer.dataset.loaded = "true";
      } catch (err) {
        evidenceContainer.innerHTML = `<p>Error loading evidence: ${err.message}</p>`;
      }
    }
  } else {
    details.style.display = "none";
    btn.textContent = "View Details";
  }
}

// ----------- Render dispute cards -----------
function disputeCardHTML(d, isAdmin = false) {
  const created = new Date(d.created_at).toLocaleString();

  const statusColor =
    d.status === "resolved"
      ? "status-resolved"
      : d.status === "in_progress"
      ? "status-progress"
      : d.status === "rejected"
      ? "status-rejected"
      : "status-open";

  const raisedBy = `${d.raised_by_first_name || "-"} ${
    d.raised_by_last_name || "-"
  } (${d.raised_by_role || "N/A"})`;

  const against = d.against_first_name
    ? `${d.against_first_name} ${d.against_last_name} (${d.against_role})`
    : "-";

  return `
    <div class="dispute-card" id="dispute-${d.id}">
      <div class="dispute-header">
        <div>
          <h3>Dispute Title: ${d.project_title || "Untitled"}</h3>
          <p><strong>Raised By:</strong> ${raisedBy}</p>
          <p><strong>Against:</strong> ${against}</p>
          <p><strong>Reason:</strong> ${d.reason}</p>
          <p><strong>Status:</strong> 
            <span class="status-badge ${statusColor}">
              ${d.status.replace("_", " ").toUpperCase()}
            </span>
          </p>
        </div>

        <div>
          <p><strong>Date:</strong> ${created}</p>
          <button class="btn-outline toggle-details " data-id="${d.id}">
            ${
              document.querySelector(`#details-${d.id}`)?.style.display ===
              "block"
                ? "Hide Details"
                : "View Details"
            }
          </button>

          ${
            isAdmin
              ? `
                <div class="admin-actions" style="margin-top:0.5rem;">
                  <button class="btn btn-primary btn-manage" data-id="${d.id}">
                    Manage / Review
                  </button>
                </div>`
              : ""
          }
        </div>
      </div>

      <div class="dispute-details" id="details-${d.id}" style="display:none;">
        <p><strong>Description:</strong> ${d.description || "-"}</p>
        <div class="evidence-section" id="evidence-${d.id}">
          Loading evidence...
        </div>
      </div>
    </div>
  `;
}

// ====== Opening the modal after Manage Reviews

function attachAdminManageButtons() {
  document.querySelectorAll(".btn-manage").forEach((btn) => {
    btn.onclick = async () => {
      const disputeId = btn.dataset.id;

      // Fetch dispute details to populate modal
      let dispute;
      try {
        const res = await fetchWithAuth(`${BASE_URL}/disputes`);
        dispute = res.disputes.find((d) => d.id === disputeId);
      } catch (err) {
        return alert("Failed to fetch dispute details.");
      }

      openResolveModal(dispute);
    };
  });
}

// ----------- Render Evidence -----------
function renderEvidence(url) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isPdf = /\.pdf$/i.test(url);
  const label = isPdf
    ? "📄 View PDF"
    : isImage
    ? "🖼 View Image"
    : "📁 Download File";
  return `<div class="evidence-item">
    <button class="evidence-btn" style="cursor:pointer;" onclick="openEvidenceModal('${url}')">${label}</button>
  </div>`;
}

// ----------- Evidence Modal -----------
window.openEvidenceModal = function (url) {
  const modal = document.createElement("div");
  modal.className = "evidence-modal-backdrop";
  modal.innerHTML = `
    <div class="evidence-modal-content">
      <span class="evidence-modal-close">&times;</span>
      <iframe class="evidence-modal-frame" src="${url}" frameborder="0"></iframe>
    </div>
  `;

  document.body.appendChild(modal);

  // Close actions
  modal.querySelector(".evidence-modal-close").onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
};

// ----------- Dispute creation modal -----------
async function openDisputeForm() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.id = "create-dispute-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="modal-close">&times;</span>
      <h2>Raise a Dispute</h2>
      <div class="form-group">
        <label>Project Title</label>
        <input type="text" id="dispute-project-title" class="input" placeholder="Enter project title" />
      </div>
      <div class="form-group">
        <label>Reason</label>
        <input type="text" id="dispute-reason" class="input" placeholder="Short reason" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="dispute-description" class="input textarea" rows="5" placeholder="Describe your issue"></textarea>
      </div>
      <div class="form-group">
        <label>Against</label>
        <select id="dispute-against" class="input"><option value="">-- Select user --</option></select>
      </div>
      <div class="form-group">
        <label>Upload Contract / Evidence</label>
        <input type="file" id="dispute-attachments" class="input" multiple />
      </div>
      <p id="dispute-status" style="margin-top:0.5rem;"></p>
      <button class="btn btn-success full" id="submit-dispute">Submit Dispute</button>
      <button class="btn btn-secondary full" id="cancel-dispute" style="margin-top:0.5rem;">Cancel</button>
    </div>`;

  document.body.appendChild(modal);
  modal.querySelector(".modal-close").onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.getElementById("cancel-dispute").onclick = () => modal.remove();

  const statusEl = document.getElementById("dispute-status");
  const submitBtn = document.getElementById("submit-dispute");

  try {
    const res = await fetchWithAuth(`${BASE_URL}/disputes/users/for-dispute`);
    const users = res.users || [];
    const againstSelect = document.getElementById("dispute-against");
    users.forEach((u) => {
      const option = document.createElement("option");
      option.value = u.id;
      option.textContent = `${u.first_name} ${u.last_name} (${u.role})`;
      againstSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load users for dispute:", err);
  }

  submitBtn.onclick = async () => {
    const title = document.getElementById("dispute-project-title").value;
    const reason = document.getElementById("dispute-reason").value;
    const description = document.getElementById("dispute-description").value;
    const files = document.getElementById("dispute-attachments").files;
    const againstId = document.getElementById("dispute-against").value;

    if (!title || !reason) {
      statusEl.textContent = "Project title and reason are required.";
      return;
    }

    const formData = new FormData();
    formData.append("project_title", title);
    formData.append("reason", reason);
    formData.append("description", description);
    for (const file of files) formData.append("attachments", file);
    if (againstId) formData.append("against", againstId);

    try {
      statusEl.textContent = "Submitting...";
      await fetchWithAuth(`${BASE_URL}/disputes`, {
        method: "POST",
        body: formData,
      });
      statusEl.textContent = "Dispute submitted ✅";
      setTimeout(() => {
        modal.remove();
        loadDisputes();
      }, 1000);
    } catch (err) {
      statusEl.textContent = `Failed to submit: ${err.message}`;
      console.error(err);
    }
  };
}
