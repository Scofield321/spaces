import { BASE_URL } from "./config.js";
import { Session } from "./session.js";
import { showLoader, hideLoader } from "./loader.js";

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
  if (!res.ok)
    throw new Error(
      (await res.json()).message || "Something Wrong Happened, Try Again"
    );
  return res.json();
}

// ---------- Helper: Format overview text ----------
function formatOverview(text) {
  if (!text) return "-";

  const sections = text.split(/\n{1,2}/);
  return sections
    .map((sec) => {
      const lower = sec.toLowerCase();
      if (lower.startsWith("skills & technologies")) {
        const skillsList = sec
          .replace(/skills & technologies[:]?/i, "")
          .split(/[:,]/)
          .map((s) => `<li>${s.trim()}</li>`)
          .join("");
        return `<h4>Skills & Technologies</h4><ul>${skillsList}</ul>`;
      } else if (lower.startsWith("experience")) {
        const expList = sec
          .replace(/experience[:]?/i, "")
          .split(/\.|\n/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => `<li>${s}</li>`)
          .join("");
        return `<h4>Experience</h4><ul>${expList}</ul>`;
      } else if (lower.startsWith("key achievements")) {
        const achList = sec
          .replace(/key achievements[:]?/i, "")
          .split(/\.|\n/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => `<li>${s}</li>`)
          .join("");
        return `<h4>Key Achievements</h4><ul>${achList}</ul>`;
      } else if (lower.startsWith("what i offer")) {
        const offerList = sec
          .replace(/what i offer[:]?/i, "")
          .split(/\.|\n/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => `<li>${s}</li>`)
          .join("");
        return `<h4>What I Offer</h4><ul>${offerList}</ul>`;
      } else if (lower.startsWith("why work with me")) {
        return `<h4>Why Work With Me</h4><p>${sec.replace(
          /why work with me[:]?/i,
          ""
        )}</p>`;
      } else {
        return `<p>${sec}</p>`;
      }
    })
    .join("");
}

// ---------- Load Freelancer Profile ----------
export async function loadFreelancerProfile() {
  const content = document.getElementById("main-content");
  showLoader();
  try {
    const data = await fetchWithAuth(`${BASE_URL}/freelancer/profile`);
    const { user, skills, projects, portfolio_images = [] } = data;

    content.innerHTML = `
  <section class="profile-section">

    <div class="profile-header">
      <img id="profile-picture" 
           src="${user.profile_picture || "https://placehold.co/100"}" 
           alt="Profile Image" 
           style="width:120px;height:120px;border-radius:50%;object-fit:cover"/>
      <h2>
        ${user.first_name || ""} ${user.last_name || ""}
        ${
          user.freelancer_verified
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

      <p id="freelancer-title">${user.title || ""}</p>
      <p>${user.city || "-"}</p>
      <button id="edit-profile-btn" class="btn primary">Edit Profile</button>
    </div>

    <div class="card" id="profile-info-card">
      <h3>Overview</h3>
      <div class="overview-text">${formatOverview(user.overview)}</div>
      <p><strong>Hourly Rate:</strong> $${
        user.hourly_rate || " Not charging hourly"
      }</p>
      <p><strong>Service Rate:</strong> $${
        user.service_rate || " Not charging per service"
      }</p>
      <p><strong>Verification Status:</strong> ${
        user.verification_status || "pending"
      }</p>
    </div>

    <div class="card">
      <h3>Skills</h3>
      ${
        skills && skills.length
          ? `<ul id="skills-list">
              ${skills.map((s) => `<li>${s.skill_name || s}</li>`).join("")}
             </ul>`
          : `<p class="muted">No skills added yet.</p>`
      }
    </div>

    <div class="card">
      <h3>Projects</h3>
      ${
        projects && projects.length
          ? `<ul id="projects-list">
              ${projects
                .map(
                  (p) =>
                    `<li>
                  ${p.title || p.name || "Untitled project"}
                  ${
                    p.link
                      ? ` - <a href="${p.link}" target="_blank">View</a>`
                      : ""
                  }
                </li>`
                )
                .join("")}
             </ul>`
          : `<p class="muted">No projects added yet.</p>`
      }
    </div>

    <div class="card">
      <h3>Portfolio</h3>
      <div class="portfolio-images">
        ${
          portfolio_images && portfolio_images.length
            ? portfolio_images
                .map(
                  (url) =>
                    `<img src="${url}" alt="Portfolio Image" 
                    style="width:120px;height:120px;object-fit:cover;margin:5px;border-radius:8px"/>`
                )
                .join("")
            : `<p class="muted">No portfolio images uploaded yet.</p>`
        }
      </div>
    </div>

  </section>
`;

    document.getElementById("edit-profile-btn").onclick = () => {
      renderEditProfile(user, skills, projects);
    };
  } catch (e) {
    console.error(e);
  } finally {
    hideLoader(); // ✅ hide loader at end, even on error
  }
}

// ---------- Render Edit Form ----------
function renderEditProfile(user, skills = [], projects = []) {
  const modal = document.createElement("div");
  modal.id = "edit-profile-modal";
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-content">
      <span class="modal-close">&times;</span>

      <div class="profile-header">
        <div class="profile-upload-wrapper" id="profile-upload-area">
          <img id="profile-picture_preview" class="profile-preview" src="${
            user.profile_picture || "https://placehold.co/100"
          }" alt="Profile Image"/>
          <input type="file" id="profile_picture_input" accept="image/*" hidden />
          <div class="upload-overlay">
            <span>Click to Upload<br>or Drag & Drop</span>
          </div>
          <div id="upload-spinner" class="loader hidden"></div>
        </div>
    
        <h2>Edit Profile</h2>
        <div id="upload-status" style="margin-top:0.5rem;"></div>
      </div>

      <!-- Portfolio Upload -->
      <div class="card form-card">
        <h3>Portfolio</h3>
        <div id="portfolio-upload-box" class="gallery-upload-box">
          <span>Click to Upload<br>or Drag & Drop</span>
          <input type="file" id="portfolio_input" accept="image/*" multiple hidden>
        </div>
        <div id="portfolio-preview" class="gallery-grid"></div>
      </div>

      <div class="card form-card">
        <div class="form-group">
          <label>Country & City (comma separated)</label>
          <input type="text" id="city" class="input" value="${
            user.city || ""
          }"/>
        </div>

        <div class="form-group">
          <label>Edit your title</label>
          <input type="text" id="title" class="input" value="${
            user.title || ""
          }"/>
        </div>

        <div class="form-group">
        <label for="overview">
          Overview
          <small class="hint">
            (Tell clients about yourself — include your skills, experience, strengths, major project accomplishments, and education.)
          </small>
      </label>
          <textarea id="overview" class="input textarea" rows="10">${
            user.overview || ""
          }</textarea>
        </div>

        <div class="form-group">
          <label for="skills">Skills</label>
          <input
            type="text"
            id="skills"
            class="input"
            placeholder="e.g. JavaScript, Node.js, React, UI Design"
            value="${skills.map((s) => s.skill_name || s).join(", ")}"
          />
          <small class="hint">Separate multiple skills with commas</small>
        </div>

        <div class="form-group">
          <label for="projects">Projects</label>
          <textarea
            id="projects"
            class="input textarea"
            rows="6"
            placeholder="Describe key projects or accomplishments..."
          >${projects.map((p) => p.title || p.name || "").join("\n")}</textarea>
          <small class="hint">
            List your top projects — include names, what you built, or links.
          </small>
        </div>


        <div class="grid-2">
          <div class="form-group">
            <label>Hourly Rate ($)</label>
            <input type="number" id="hourly_rate" class="input" value="${
              user.hourly_rate || ""
            }"/>
          </div>
          <div class="form-group">
            <label>Service Rate ($)</label>
            <input type="number" id="service_rate" class="input" value="${
              user.service_rate || ""
            }"/>
          </div>
        </div>

        <div class="card">
          <h3>Skills</h3>
          <ul id="skills-list">${skills
            .map((s) => `<li>${s.skill_name}</li>`)
            .join("")}</ul>
        </div>

        <div class="card">
          <h3>Projects</h3>
          <ul id="projects-list">${projects
            .map(
              (p) =>
                `<li>${p.title} - <a href="${
                  p.link || "#"
                }" target="_blank">View</a></li>`
            )
            .join("")}</ul>
        </div>


        <button id="save-profile-btn" class="btn btn-success full">Save Profile</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // ---------- MODAL CLOSE ----------
  modal.querySelector(".modal-close").onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  // ---------- PROFILE PICTURE UPLOAD ----------
  const profileInput = document.getElementById("profile_picture_input");
  const uploadArea = document.getElementById("profile-upload-area");
  const spinner = document.getElementById("upload-spinner");
  const previewImg = document.getElementById("profile-picture_preview");
  const uploadStatus = document.getElementById("upload-status");
  let uploadedProfileUrl = user.profile_picture || null;

  uploadArea.onclick = () => profileInput.click();
  uploadArea.ondragover = (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "#007bff";
  };
  uploadArea.ondragleave = () => {
    uploadArea.style.borderColor = "#e0e0e0";
  };
  uploadArea.ondrop = (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "#e0e0e0";
    if (e.dataTransfer.files.length) {
      profileInput.files = e.dataTransfer.files;
      profileInput.onchange();
    }
  };

  profileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    previewImg.src = URL.createObjectURL(file);
    spinner.classList.remove("hidden");
    uploadStatus.textContent = "";

    const formData = new FormData();
    formData.append("profile_picture", file);

    try {
      showLoader();
      const res = await fetchWithAuth(
        `${BASE_URL}/freelancer/profile/profile-picture`,
        { method: "POST", body: formData }
      );
      uploadedProfileUrl = res.url;
      uploadStatus.textContent = "Profile picture uploaded ✅";
    } catch {
      uploadStatus.textContent = "❌ Upload failed";
    } finally {
      spinner.classList.add("hidden");
      hideLoader(); // ✅ hide loader after upload
    }
  };

  // ---------- PORTFOLIO UPLOAD & MANAGEMENT ----------
  const portfolioBox = document.getElementById("portfolio-upload-box");
  const portfolioInput = document.getElementById("portfolio_input");
  const portfolioPreview = document.getElementById("portfolio-preview");
  let portfolioFiles = [];

  // Load existing portfolio images
  if (user.portfolio_images?.length) {
    user.portfolio_images.forEach((url) =>
      addPortfolioImage({ uploadedUrl: url })
    );
  }

  portfolioBox.onclick = () => portfolioInput.click();
  portfolioBox.ondragover = (e) => {
    e.preventDefault();
    portfolioBox.style.borderColor = "#007bff";
  };
  portfolioBox.ondragleave = () => {
    portfolioBox.style.borderColor = "#b5b5b5";
  };
  portfolioBox.ondrop = (e) => {
    e.preventDefault();
    portfolioBox.style.borderColor = "#b5b5b5";
    handlePortfolioFiles(e.dataTransfer.files);
  };
  portfolioInput.onchange = () => handlePortfolioFiles(portfolioInput.files);

  function handlePortfolioFiles(files) {
    [...files].forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      portfolioFiles.push(file);
      addPortfolioImage(file);
      uploadPortfolioImage(file);
    });
  }

  function addPortfolioImage(file) {
    const url = file.uploadedUrl || URL.createObjectURL(file);
    const item = document.createElement("div");
    item.className = "gallery-item";
    item.style.position = "relative";

    item.innerHTML = `
      <img src="${url}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;cursor:pointer"/>
      <button class="delete-btn" style="position:absolute;top:4px;right:4px;background:rgba(255,0,0,0.7);color:white;border:none;border-radius:4px;cursor:pointer;">✕</button>
    `;

    // Click to enlarge
    item.querySelector("img").onclick = () => openLightbox(url);

    // Delete button
    item.querySelector(".delete-btn").onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this image?")) return;

      if (file.uploadedUrl) {
        try {
          const res = await fetchWithAuth(
            `${BASE_URL}/freelancer/profile/portfolio/delete`,
            {
              method: "DELETE",
              body: JSON.stringify({ url: file.uploadedUrl }),
            }
          );
          if (!res.success) throw new Error("Failed to delete image");
          portfolioFiles = portfolioFiles.filter((f) => f !== file);
          item.remove();
        } catch (err) {
          console.error(err);
          alert("Failed to delete image");
        }
      } else {
        portfolioFiles = portfolioFiles.filter((f) => f !== file);
        item.remove();
      }
    };

    portfolioPreview.prepend(item);
  }

  async function uploadPortfolioImage(file) {
    if (file.uploadedUrl) return;

    const formData = new FormData();
    formData.append("files", file);

    try {
      showLoader();
      const res = await fetchWithAuth(
        `${BASE_URL}/freelancer/profile/upload-project-images`,
        { method: "POST", body: formData }
      );
      file.uploadedUrl = res.urls[0];
    } catch (err) {
      console.error("Failed to upload portfolio image:", file.name, err);
      alert("Failed to upload portfolio image: " + file.name);
    } finally {
      hideLoader(); // ✅ hide loader after upload
    }
  }

  // ---------- LIGHTBOX ----------
  const lightbox = document.createElement("div");
  lightbox.id = "lightbox";
  lightbox.style = `
    display:none;position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.8);justify-content:center;align-items:center;z-index:9999;
  `;
  const lightboxImg = document.createElement("img");
  lightboxImg.style = "max-width:90%;max-height:90%;border-radius:10px";
  lightbox.appendChild(lightboxImg);
  document.body.appendChild(lightbox);

  function openLightbox(url) {
    lightboxImg.src = url;
    lightbox.style.display = "flex";
  }

  lightbox.onclick = () => {
    lightbox.style.display = "none";
    lightboxImg.src = "";
  };

  // ---------- SAVE PROFILE ----------
  document.getElementById("save-profile-btn").onclick = async () => {
    const portfolioUrls = portfolioFiles
      .map((f) => f.uploadedUrl)
      .filter(Boolean);

    // Collect updated data
    const updatedData = {
      profile_picture: uploadedProfileUrl,
      city: document.getElementById("city").value.trim(),
      title: document.getElementById("title").value.trim(),
      overview: document.getElementById("overview").value.trim(),
      hourly_rate: document.getElementById("hourly_rate").value.trim(),
      service_rate: document.getElementById("service_rate").value.trim(),
      portfolio_images: portfolioUrls,

      // ✅ New fields for skills & projects
      skills: document
        .getElementById("skills")
        .value.split(",")
        .map((s) => s.trim())
        .filter((s) => s)
        .map((s) => ({ skill_name: s })),

      projects: document
        .getElementById("projects")
        .value.split("\n")
        .map((p) => ({ title: p.trim() }))
        .filter((p) => p.title),
    };

    try {
      showLoader();
      await fetchWithAuth(`${BASE_URL}/freelancer/profile`, {
        method: "PUT",
        body: JSON.stringify(updatedData),
      });
      alert("Profile saved ✅");
      modal.remove();
      loadFreelancerProfile();
    } catch (err) {
      alert(`Failed to save profile: ${err.message}`);
    } finally {
      hideLoader(); // ✅ hide loader after upload
    }
  };
}
