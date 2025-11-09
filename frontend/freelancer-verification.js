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
      (await res.json()).msg || "Something Wrong Happened, Try Again"
    );
  return res.json();
}

// ---------- Document Modal ----------
const modal = document.getElementById("document-modal");
const modalFrame = document.getElementById("document-frame");
const closeModalBtn = document.querySelector(".close-modal");

window.previewDocument = (url) => {
  modalFrame.src = url;
  modal.style.display = "flex";
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

// ---------- Load Freelancer Verification ----------
export const loadFreelancerVerification = async () => {
  const main = document.getElementById("main-content");
  showLoader(); // show loader at the start
  let verification = null;

  try {
    const res = await fetchWithAuth(`${BASE_URL}/freelancer-verification/me`);
    verification = res.verification;
  } catch (err) {
    hideLoader(); // hide loader on error
    if (err.message !== "No verification submitted yet") {
      main.innerHTML = `<p class="text-danger">Error: ${err.message}</p>`;
      return;
    }
  }

  hideLoader(); // hide loader after API finishes
  const isRejected = verification?.status === "rejected";

  // ---------- Helper: render form ----------
  const renderForm = (docType = "") => `
    <div class="card form-card" style="margin-top:1rem">
      <h2>${verification ? "Resubmit" : "Submit"} Verification Documents</h2>
      <form id="verification-form" class="verification-form">
        <div class="form-group">
          <label>Document Type</label>
          <select name="document_type" class="input" required>
            <option value="">Select document</option>
            <option value="National ID" ${
              docType === "National ID" ? "selected" : ""
            }>National ID</option>
            <option value="Passport" ${
              docType === "Passport" ? "selected" : ""
            }>Passport</option>
            <option value="Driving Licence" ${
              docType === "Driving Licence" ? "selected" : ""
            }>Driving Licence</option>
          </select>
        </div>
        <div class="form-group">
          <label>Front of Document</label>
          <input type="file" name="front" class="input" required />
        </div>
        <div class="form-group">
          <label>Back of Document </label>
          <input type="file" name="back" class="input" />
        </div>
        <button type="submit" class="btn btn-success full">${
          verification ? "Resubmit" : "Submit"
        }</button>
      </form>
      <div id="verification-result" style="margin-top:1rem"></div>
    </div>
  `;

  // ---------- Render based on verification status ----------
  if (!verification) {
    main.innerHTML = renderForm();
    attachFormHandler();
    return;
  }

  main.innerHTML = `
    <div class="card form-card">
      <h2>Verification Status</h2>
      <div class="verification-info">
        <p><strong>Document Type:</strong> ${
          verification.document_type || "N/A"
        }</p>
        <p><strong>Status:</strong> 
          <span class="status-badge ${verification.status.toLowerCase()}">
            ${
              verification.status.charAt(0).toUpperCase() +
              verification.status.slice(1)
            }
          </span>
        </p>
        ${
          isRejected
            ? `<p><strong>Rejection Reason:</strong> ${
                verification.rejection_reason || "No reason provided"
              }</p>`
            : ""
        }
        <p><strong>Submitted At:</strong> ${new Date(
          verification.submitted_at
        ).toLocaleString()}</p>
        ${
          verification.reviewed_at
            ? `<p><strong>Reviewed At:</strong> ${new Date(
                verification.reviewed_at
              ).toLocaleString()}</p>`
            : ""
        }
        <p><strong>Documents:</strong></p>
        <div class="verification-docs">
          <button class="btn btn-sm btn-outline" onclick="previewDocument('${
            verification.document_front
          }')">View Front</button>
          ${
            verification.document_back
              ? `<button class="btn btn-sm btn-outline" onclick="previewDocument('${verification.document_back}')">View Back</button>`
              : ""
          }
        </div>
      </div>
    </div>
  `;

  if (isRejected) {
    main.innerHTML += renderForm(verification.document_type);
    attachFormHandler();
  }

  // ---------- Form handler ----------
  function attachFormHandler() {
    const form = document.getElementById("verification-form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      try {
        showLoader();
        await fetchWithAuth(`${BASE_URL}/freelancer-verification/submit`, {
          method: "POST",
          body: data,
        });
        await loadFreelancerVerification(); // reload verification status
      } catch (err) {
        document.getElementById("verification-result").innerHTML = `
          <div class="status-badge rejected">${err.message}</div>
        `;
      } finally {
        hideLoader();
      }
    };
  }
};
