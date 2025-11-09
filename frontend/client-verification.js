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
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.msg || "Something Wrong Happened, Try Again");
  }
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

// ---------- Load Client Verification ----------
export const loadClientVerification = async () => {
  const main = document.getElementById("main-content");

  showLoader();
  let verification = null;
  try {
    const res = await fetchWithAuth(`${BASE_URL}/client-verification/me`);
    verification = res.verification;
  } catch (err) {
    // 404 = no verification submitted yet
    if (err.message !== "No verification submitted yet") {
      main.innerHTML = `<p class="text-danger">Error: ${err.message}</p>`;
      hideLoader();
      return;
    }
  } finally {
    hideLoader(); // ✅ Hide loader after fetch
  }

  // ---------- No verification yet ----------
  if (!verification) {
    main.innerHTML = `
      <div class="card form-card">
        <h2>Submit Verification Documents</h2>
        <form id="verification-form" class="verification-form">
          <div class="form-group">
            <label>Document Type</label>
            <select name="document_type" class="input" required>
              <option value="">Select document</option>
              <option value="National ID">National ID</option>
              <option value="Passport">Passport</option>
              <option value="Driving Licence">Driving Licence</option>
            </select>
          </div>
          <div class="form-group">
            <label>Front of Document</label>
            <input type="file" name="front" class="input" required />
          </div>
          <div class="form-group">
            <label>Back of Document</label>
            <input type="file" name="back" class="input" />
          </div>
          <button type="submit" class="btn btn-success full">Submit Verification</button>
        </form>
        <div id="verification-result" style="margin-top:1rem;"></div>
      </div>
    `;

    const form = document.getElementById("verification-form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      try {
        showLoader();
        await fetchWithAuth(`${BASE_URL}/client-verification/submit`, {
          method: "POST",
          body: data,
        });
        loadClientVerification();
      } catch (err) {
        document.getElementById("verification-result").innerHTML = `
          <div class="status-badge rejected">${err.message}</div>
        `;
      } finally {
        hideLoader(); // ✅ Hide loader after submission
      }
    };
    return;
  }

  // ---------- Verification exists ----------
  const isRejected = verification.status === "rejected";

  main.innerHTML = `
    <div class="card form-card">
      <h2>${
        isRejected ? "Resubmit Verification Documents" : "Verification Status"
      }</h2>
      
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

      <form id="verification-form" class="verification-form">
        <div class="form-group">
          <label>Document Type</label>
          <select name="document_type" class="input" required>
            <option value="">Select document</option>
            <option value="National ID" ${
              verification.document_type === "National ID" ? "selected" : ""
            }>National ID</option>
            <option value="Passport" ${
              verification.document_type === "Passport" ? "selected" : ""
            }>Passport</option>
            <option value="Driving Licence" ${
              verification.document_type === "Driving Licence" ? "selected" : ""
            }>Driving Licence</option>
          </select>
        </div>

        <div class="form-group">
          <label>Front of Document</label>
          <input type="file" name="front" class="input" ${
            isRejected ? "" : "disabled"
          } />
          ${
            verification.document_front
              ? `<button type="button" class="btn btn-sm btn-outline" onclick="previewDocument('${verification.document_front}')">View Front</button>`
              : ""
          }
        </div>

        <div class="form-group">
          <label>Back of Document (optional)</label>
          <input type="file" name="back" class="input" ${
            isRejected ? "" : "disabled"
          } />
          ${
            verification.document_back
              ? `<button type="button" class="btn btn-sm btn-outline" onclick="previewDocument('${verification.document_back}')">View Back</button>`
              : ""
          }
        </div>

        ${
          isRejected
            ? `<button type="submit" class="btn btn-success full">Resubmit</button>`
            : ""
        }
      </form>

      <div id="verification-result" style="margin-top:1rem;"></div>
    </div>
  `;

  if (isRejected) {
    const form = document.getElementById("verification-form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      try {
        showLoader();
        await fetchWithAuth(`${BASE_URL}/client-verification/submit`, {
          method: "POST",
          body: data,
        });
        loadClientVerification();
      } catch (err) {
        document.getElementById("verification-result").innerHTML = `
          <div class="status-badge rejected">${err.message}</div>
        `;
      } finally {
        hideLoader(); // ✅ Hide loader
      }
    };
  }
};
