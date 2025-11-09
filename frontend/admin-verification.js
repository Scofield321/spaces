import { BASE_URL } from "./config.js";
import { Session } from "./session.js";
import { showLoader, hideLoader } from "./loader.js";

/* ================= API Helper ================= */
async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type":
      options.body instanceof FormData ? undefined : "application/json",
    Authorization: `Bearer ${Session.token()}`,
  };

  showLoader();
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.msg || "Something Wrong Happened, Try Again");
    }
    return res.json();
  } finally {
    hideLoader();
  }
}

/* ================= Document Modal ================= */
const modal = document.getElementById("document-modal");
const modalFrame = document.getElementById("document-frame");
const closeModalBtn = document.querySelector(".close-modal");

function previewDocument(url) {
  modalFrame.src = url;
  modal.style.display = "flex";
}

function closeDocumentModal() {
  modal.style.display = "none";
  modalFrame.src = "";
}

closeModalBtn.onclick = closeDocumentModal;
window.onclick = (event) => {
  if (event.target === modal) closeDocumentModal();
};

/* ================= Load Verifications ================= */
export const loadAdminVerifications = async () => {
  const container = document.getElementById("main-content");
  container.innerHTML = `
    <div class="loader-container">
      <div class="spinner"></div>
      <p>Loading verifications...</p>
    </div>
  `;

  try {
    const { verifications = [] } = await fetchWithAuth(
      `${BASE_URL}/admin/verifications/all`
    );

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
      <div class="verification-list" id="verification-list"></div>
    `;

    const list = document.getElementById("verification-list");
    list.innerHTML = verifications
      .map((v) => renderVerificationCard(v))
      .join("");

    attachVerificationActions();
  } catch (err) {
    container.innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
};

/* ================= Render Verification Card ================= */
function renderVerificationCard(v) {
  const statusClass =
    v.status === "pending"
      ? "badge-pending"
      : v.status === "approved"
      ? "badge-success"
      : "badge-rejected";

  return `
    <div class="card-soft verification-card" data-id="${v.id}">
      <div class="verification-header">
        <h4>${v.first_name || ""} ${v.last_name || ""}</h4>
        <span class="badge ${statusClass}">${
    v.status.charAt(0).toUpperCase() + v.status.slice(1)
  }</span>
      </div>
      <div class="verification-info">
        <p><strong>Document:</strong> ${v.document_type || "-"}</p>
        <p><strong>Role:</strong> ${v.user_role || "-"}</p>
        <p><strong>Submitted At:</strong> ${
          v.submitted_at ? new Date(v.submitted_at).toLocaleString() : "-"
        }</p>
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
        <button class="btn btn-sm btn-outline view-front">View Front</button>
        ${
          v.document_back
            ? `<button class="btn btn-sm btn-outline view-back">View Back</button>`
            : ""
        }
        ${
          v.status === "pending"
            ? `<button class="btn btn-sm btn-success approve-btn">✔ Approve</button>
               <button class="btn btn-sm btn-danger reject-btn">✖ Reject</button>`
            : `<span class="text-muted">No actions available</span>`
        }
      </div>
    </div>
  `;
}

/* ================= Attach Action Handlers ================= */
function attachVerificationActions() {
  document.querySelectorAll(".verification-card").forEach((card) => {
    const id = card.dataset.id;

    card.querySelector(".view-front")?.addEventListener("click", () => {
      const url = card.querySelector(".view-front").dataset.url;
      previewDocument(url);
    });

    card.querySelector(".view-back")?.addEventListener("click", () => {
      const url = card.querySelector(".view-back").dataset.url;
      previewDocument(url);
    });

    card.querySelector(".approve-btn")?.addEventListener("click", async () => {
      if (!confirm("Approve this verification?")) return;
      try {
        await fetchWithAuth(`${BASE_URL}/admin/verifications/approve/${id}`, {
          method: "POST",
        });
        loadAdminVerifications();
      } catch (err) {
        alert(err.message || "Failed to approve verification");
      }
    });

    card.querySelector(".reject-btn")?.addEventListener("click", async () => {
      const reason = prompt("Enter rejection reason:");
      if (!reason) return;
      try {
        await fetchWithAuth(`${BASE_URL}/admin/verifications/reject/${id}`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        });
        loadAdminVerifications();
      } catch (err) {
        alert(err.message || "Failed to reject verification");
      }
    });
  });
}
