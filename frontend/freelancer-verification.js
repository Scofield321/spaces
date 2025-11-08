import { BASE_URL } from "./config.js";
import { Session } from "./session.js";

// ---------- API Wrapper ----------
async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type":
      options.body instanceof FormData ? undefined : "application/json",
    Authorization: `Bearer ${Session.token()}`,
  };
  const res = await fetch(url, options);
  if (!res.ok) throw new Error((await res.json()).msg || "API Error");
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

  try {
    const { verification } = await fetchWithAuth(
      `${BASE_URL}/freelancer-verification/me`
    );

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
            verification.status === "rejected"
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
  } catch (err) {
    // No verification yet, show form
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
            <label>Back of Document (optional)</label>
            <input type="file" name="back" class="input" />
          </div>

          <button type="submit" class="btn btn-success full">Submit Verification</button>
        </form>
        <div id="verification-result" style="margin-top: 1rem;"></div>
      </div>
    `;

    // Attach submit handler
    const form = document.getElementById("verification-form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      try {
        await fetchWithAuth(`${BASE_URL}/freelancer-verification/submit`, {
          method: "POST",
          body: data,
        });
        document.getElementById("verification-result").innerHTML = `
          <div class="status-badge completed">Verification Submitted Successfully</div>
        `;
        loadFreelancerVerification();
      } catch (err) {
        document.getElementById("verification-result").innerHTML = `
          <div class="status-badge rejected">${err.message}</div>
        `;
      }
    };
  }
};
