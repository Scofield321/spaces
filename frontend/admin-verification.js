import { BASE_URL } from "./config.js";
import { Session } from "./session.js";

// ---------- API Wrapper ----------
async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    Authorization: `Bearer ${Session.token()}`,
  };
  const res = await fetch(url, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.msg || "API Error");
  }
  return res.json();
}

// ---------- Document Modal ----------
const modal = document.getElementById("document-modal");
const modalFrame = document.getElementById("document-frame");
const closeModalBtn = document.querySelector(".close-modal");

window.previewDocument = (url) => {
  modalFrame.src = url;
  modal.style.display = "block";
};

closeModalBtn.onclick = () => {
  modal.style.display = "none";
  modalFrame.src = "";
};

window.onclick = (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
    modalFrame.src = "";
  }
};

// ---------- Load All Verifications ----------
export const loadAdminVerifications = async () => {
  const container = document.getElementById("main-content");
  container.innerHTML = `
    <div class="loader-container">
      <div class="spinner"></div>
      <p>Loading verifications...</p>
    </div>
  `;

  try {
    const res = await fetchWithAuth(`${BASE_URL}/admin/verifications/all`); // Fetch all
    const { verifications } = res;

    if (!verifications.length) {
      container.innerHTML = `
        <div class="empty-state">
          <img src="./assets/empty.svg" class="empty-img" />
          <h3>No Verifications Found</h3>
          <p>There are currently no verification requests.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <h2 class="page-title">All Verifications</h2>
      <div class="verification-list">
        ${verifications
          .map((v) => {
            const statusClass =
              v.status === "pending"
                ? "badge-pending"
                : v.status === "approved"
                ? "badge-success"
                : "badge-rejected";

            // Hide approve/reject buttons if not pending
            const actions =
              v.status === "pending"
                ? `
                  <button class="btn btn-sm btn-success" onclick="approveVerification('${v.id}')">✔ Approve</button>
                  <button class="btn btn-sm btn-danger" onclick="rejectVerificationPrompt('${v.id}')">✖ Reject</button>
                `
                : `<span class="text-muted">No actions available</span>`;

            return `
              <div class="card-soft verification-card">
                <div class="verification-header">
                  <h4>${v.first_name} ${v.last_name}</h4>
                  <span class="badge ${statusClass}">${
              v.status.charAt(0).toUpperCase() + v.status.slice(1)
            }</span>
                </div>
                <div class="verification-info">
                  <p><strong>Document:</strong> ${v.document_type}</p>
                  <p><strong>Role:</strong> ${v.user_role}</p>
                  <p><strong>Submitted At:</strong> ${new Date(
                    v.submitted_at
                  ).toLocaleString()}</p>
                  ${
                    v.reviewed_at
                      ? `<p><strong>Reviewed At:</strong> ${new Date(
                          v.reviewed_at
                        ).toLocaleString()}</p>`
                      : ""
                  }
                  ${
                    v.status === "rejected"
                      ? `<p><strong>Rejection Reason:</strong> ${
                          v.rejection_reason || "No reason provided"
                        }</p>`
                      : ""
                  }
                </div>
                <div class="verification-actions">
                  <button class="btn btn-sm btn-outline" onclick="previewDocument('${
                    v.document_front
                  }')">View Front</button>
                  ${
                    v.document_back
                      ? `<button class="btn btn-sm btn-outline" onclick="previewDocument('${v.document_back}')">View Back</button>`
                      : ""
                  }
                  ${actions}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
};

// ---------- Approve ----------
window.approveVerification = async (id) => {
  if (!confirm("Approve this verification?")) return;
  await fetchWithAuth(`${BASE_URL}/admin/verifications/approve/${id}`, {
    method: "POST",
  });
  loadAdminVerifications();
};

// ---------- Reject ----------
window.rejectVerificationPrompt = async (id) => {
  const reason = prompt("Enter rejection reason:");
  if (!reason) return;

  await fetchWithAuth(`${BASE_URL}/admin/verifications/reject/${id}`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  loadAdminVerifications();
};
