import { BASE_URL } from "./config.js";
import { Session } from "./session.js";

// Helper for fetch with auth
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

function formatParagraphs(text) {
  if (!text) return "-";
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

// ---------- Load Client Profile ----------
export async function loadClientProfile() {
  try {
    const content = document.getElementById("main-content");
    const { user } = await fetchWithAuth(`${BASE_URL}/client/profile`);

    content.innerHTML = `
      <section class="profile-section">

        <div class="profile-header">
          <img id="profile-picture" src="${
            user.profile_picture || "https://placehold.co/100"
          }" alt="Profile Image" style="width:120px;height:120px;border-radius:50%;object-fit:cover"/>
          <h2>
            ${user.first_name || ""} ${user.last_name || ""}
            ${
              user.client_verified
                ? `<span class="verified-wrapper">
                    <svg class="verified-icon" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="#1DA1F2"></circle>
                      <path d="M17 9l-6.5 6L7 11.5"
                        stroke="#fff" stroke-width="2.2" fill="none"
                        stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>`
                : ""
            }
          </h2>
          <p id="client-company">${user.company_name || "-"}</p>
          <p>${user.city || "-"}</p>
          <button id="edit-profile-btn" class="btn-outline">Edit Profile</button>
        </div>

        <div class="card" id="profile-info-card">
          <h3>Company Description</h3>
          <div class="company-description">
            ${formatParagraphs(user.company_description)}
          </div>

          <p><strong>Address:</strong> ${user.address || "-"}</p>
          <p><strong>Domain / Website:</strong> ${user.domain || "-"}</p>
          <p><strong>Verification Status:</strong> ${
            user.verification_status || "pending"
          }</p>
        </div>

      </section>
    `;

    document.getElementById("edit-profile-btn").onclick = () =>
      renderEditProfile(user);
  } catch (e) {
    console.error(e);
  }
}

// ---------- Render Edit Form ----------
function renderEditProfile(user) {
  const modal = document.createElement("div");
  modal.id = "edit-profile-modal";
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-content">
      <span class="modal-close">&times;</span>

      <div class="profile-header">
        <div class="upload-area" id="profile-upload-area">
          <img id="profile-picture_preview" src="${
            user.profile_picture || "https://placehold.co/100"
          }" alt="Profile Image"/>
          <input type="file" id="profile_picture_input" accept="image/*" />
          <span id="upload-text">Click or drag to upload</span>
        </div>
        <h2>Edit Profile</h2>
        <div id="upload-status" style="margin-top:0.5rem;"></div>
      </div>

      <div class="card form-card">
        <div class="form-group">
          <label>Company Name</label>
          <input type="text" id="company_name" class="input" value="${
            user.company_name || ""
          }" />
        </div>

        <div class="form-group">
          <label>Company Description</label>
          <textarea id="company_description" class="input textarea" rows="6">${
            user.company_description || ""
          }</textarea>
        </div>

        <div class="form-group">
          <label>Country & City (Comma separated)</label>
          <input type="text" id="city" class="input" placeholder="e.g, China, Beijing" value="${
            user.city || ""
          }" />
        </div>

        <div class="form-group">
          <label>Address</label>
          <input type="text" id="address" class="input" value="${
            user.address || ""
          }" />
        </div>

        <div class="form-group">
          <label>Domain / Website</label>
          <input type="text" id="domain" class="input clickable-input" value="${
            user.domain || ""
          }" />
        </div>

        <button id="save-profile-btn" class="btn btn-success full">Save Profile</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".modal-close").onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  // Upload logic
  const profileInput = document.getElementById("profile_picture_input");
  const previewImg = document.getElementById("profile-picture_preview");
  const uploadText = document.getElementById("upload-text");
  const uploadStatus = document.getElementById("upload-status");
  let uploadedProfileUrl = user.profile_picture || null;

  profileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    previewImg.src = URL.createObjectURL(file);
    uploadText.style.display = "none";
    uploadStatus.textContent = "Uploading...";

    const formData = new FormData();
    formData.append("profile_picture", file);

    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/client/profile/profile-picture`,
        {
          method: "POST",
          body: formData,
        }
      );
      uploadedProfileUrl = res.url;
      uploadStatus.textContent = "Uploaded ✅";
    } catch (err) {
      uploadStatus.textContent = `Upload failed: ${err.message}`;
      console.error(err);
    }
  };

  // Save profile
  document.getElementById("save-profile-btn").onclick = async () => {
    const body = {
      profile_picture: uploadedProfileUrl,
      company_name: document.getElementById("company_name").value,
      company_description: document.getElementById("company_description").value,
      city: document.getElementById("city").value,
      address: document.getElementById("address").value,
      domain: document.getElementById("domain").value,
    };

    try {
      await fetchWithAuth(`${BASE_URL}/client/profile`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      alert("Profile saved ✅");
      modal.remove();
      loadClientProfile();
    } catch (err) {
      alert(`Failed to save profile: ${err.message}`);
    }
  };
}
