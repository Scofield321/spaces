import { BASE_URL } from "./config.js";
import { Session } from "./session.js";
import { openHireModal } from "./client-hire-modal.js";
import { showLoader, hideLoader } from "./loader.js";

/* ================= API Helper ================= */
async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type":
      options.body instanceof FormData ? undefined : "application/json",
    Authorization: `Bearer ${Session.token()}`,
  };

  showLoader(); // ✅ Show loader before API call
  try {
    const res = await fetch(url, options);
    if (!res.ok)
      throw new Error(
        (await res.json()).msg || "Something Wrong Happened, Try Again"
      );
    return res.json();
  } finally {
    hideLoader(); // ✅ Hide loader after API call
  }
}

/* ================= Render Freelancer Card ================= */
export async function renderFreelancerCard(f) {
  const avatar =
    f.profile_picture ||
    `https://ui-avatars.com/api/?name=${f.first_name}+${f.last_name}&background=2563eb&color=fff`;

  return `
    <div class="freelancer-card" data-id="${f.id}">
      <div class="freelancer-header">
        <img src="${avatar}" class="avatar"/>
        <div>
        <h4>
            ${f.first_name} ${f.last_name}
            ${
              f.verified
                ? `
            <span class="verified-wrapper">
              <svg class="verified-icon" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="#1DA1F2"></circle>
                <path d="M17 9l-6.5 6L7 11.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            `
                : ""
            }
          </h4>
          <p>${f.freelancer_title || "Yet To Set Title"}</p>
        
          <p class="skills">${
            f.skills?.join(", ") || " No Skills Added Yet"
          }</p>
          <div class="rating-row">
            <span class="stars">⭐ ${Number(f.rating || 0).toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-primary hire-btn" data-id="${f.id}">Hire</button>
        <button class="btn btn-secondary invite-btn" data-id="${
          f.id
        }">Invite</button>
        <button class="btn btn-outline view-profile-btn" data-id="${
          f.id
        }">View Profile</button>
      </div>
    </div>
  `;
}

/* ================= Helper: Format Overview ================= */
function formatOverview(text) {
  if (!text) return "-";

  const sections = text.split(/\n{1,2}/); // split by line breaks
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

/* ================= Freelancer Modal ================= */
async function openFreelancerModal(freelancerId) {
  try {
    showLoader();
    // Fetch profile and reviews
    const data = await fetchWithAuth(
      `${BASE_URL}/freelancer/profile/${freelancerId}`
    );
    const reviewsRes = await fetchWithAuth(
      `${BASE_URL}/freelancer/reviews/${freelancerId}`
    );
    hideLoader();

    // Destructure with safe defaults
    const {
      user = {},
      skills = [],
      projects = [],
      portfolio_images = [],
    } = data;

    const reviews = reviewsRes.reviews || [];

    const avatar =
      user.profile_picture ||
      `https://ui-avatars.com/api/?name=${user.first_name || "User"}+${
        user.last_name || ""
      }&background=2563eb&color=fff`;

    // Remove existing modal if any
    const oldModal = document.querySelector(".modal-overlay");
    if (oldModal) oldModal.remove();

    // Build reviews HTML safely
    const reviewsHtml = reviews.length
      ? reviews
          .map(
            (r) => `
      <li style="margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>${r.client_first_name || ""} ${
              r.client_last_name || ""
            }</strong>
          <span style="font-size:12px; opacity:0.7;">${r.timeAgo || ""}</span>
        </div>
        ${
          r.project_title
            ? `<em style="font-size:13px;">${r.project_title}</em>`
            : ""
        }
        <div>⭐ ${r.rating || 0}</div>
        <p style="margin-top:3px;">${r.review_text || ""}</p>
      </li>
    `
          )
          .join("")
      : "<li>No reviews yet.</li>";

    // Create modal
    const modal = document.createElement("div");
    modal.classList.add("modal-overlay");
    modal.innerHTML = `
      <div class="modal">
        <button class="modal-close">&times;</button>

        <div class="profile-header" style="flex-direction: column; align-items: center; text-align: center;">
          <img src="${avatar}" class="modal-avatar"/>
          <h2>
            ${user.first_name || ""} ${user.last_name || ""}
            ${
              user.freelancer_verified
                ? `<span class="verified-wrapper">
                     <svg class="verified-icon" viewBox="0 0 24 24">
                       <circle cx="12" cy="12" r="10" fill="#1DA1F2"></circle>
                       <path d="M17 9l-6.5 6L7 11.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                     </svg>
                   </span>`
                : ""
            }
          </h2>
          <p>${user.title || "-"}</p>
          <p>${user.city || "-"}</p>
          <p>⭐ ${Number(user.rating || 0).toFixed(1)}</p>
        </div>

        <div class="modal-info">
          <h4>Overview</h4>
          <div class="overview-text">${formatOverview(user.overview)}</div>
          <p class="spaced-data"><strong>Hourly Rate:</strong> $${
            user.hourly_rate || "Not Charged Hourly"
          }</p>
          <p class="spaced-data"><strong>Service Rate:</strong> $${
            user.service_rate || "Not Charged Per Service"
          }</p>
        </div>

        <div class="modal-skills">
          <h4 class="spaced-data">Skills</h4>
          <ul class="spaced-data">${skills
            .map((s) => `<li>${s.skill_name || "-"}</li>`)
            .join("")}</ul>
        </div>

        <div class="modal-projects">
          <h4 class="spaced-data">Projects</h4>
          <ul class="spaced-data">
            ${projects
              .map(
                (p) =>
                  `<li>${p.title || "-"} - <a href="${
                    p.link || "#"
                  }" target="_blank">View</a></li>`
              )
              .join("")}
          </ul>
        </div>

        <div class="modal-portfolio">
          <h4 class="spaced-data">Portfolio</h4>
          <div class="portfolio-images">
            ${portfolio_images
              .map(
                (p) =>
                  `<img src="${p}" alt="Portfolio Image" style="width:120px;height:120px;object-fit:cover;margin:5px;border-radius:8px"/>`
              )
              .join("")}
          </div>
        </div>

        <div class="modal-reviews">
          <h4>Reviews</h4>
          <ul>${reviewsHtml}</ul>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Show modal
    modal.style.display = "flex";

    // Close modal
    modal.querySelector(".modal-close").onclick = () => modal.remove();
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  } catch (err) {
    hideLoader();
    console.error("Failed to load freelancer profile:", err);
    alert("Error loading profile");
  }
}

/* ================= Load Search UI ================= */
export async function loadSearchFreelancers() {
  const content = document.getElementById("main-content");

  content.innerHTML = `
    <section class="search-header card">
      <h2>Find Top Talent</h2>
      <div class="search-bar">
        <input type="text" id="freelancer-search" placeholder="Search by skill, name, project..." />
        <button id="search-btn" class="btn">Search</button>
      </div>
    </section>
    <div class="results-grid" id="freelancer-results"></div>
  `;

  const searchInput = document.getElementById("freelancer-search");
  const searchBtn = document.getElementById("search-btn");
  const resultsContainer = document.getElementById("freelancer-results");

  async function performSearch() {
    try {
      const query = searchInput.value.trim();
      const data = await fetchWithAuth(
        `${BASE_URL}/client/search-freelancers?query=${encodeURIComponent(
          query
        )}`
      );

      resultsContainer.innerHTML = (
        await Promise.all(data.freelancers.map((f) => renderFreelancerCard(f)))
      ).join("");

      attachEvents();
    } catch (err) {
      console.error("Error fetching freelancers:", err);
      resultsContainer.innerHTML = `<p class="error">Failed to load freelancers.</p>`;
    }
  }

  function attachEvents() {
    // View Profile
    document.querySelectorAll(".view-profile-btn").forEach((btn) => {
      btn.onclick = () => openFreelancerModal(btn.dataset.id);
    });

    // Hire
    document.querySelectorAll(".hire-btn").forEach((btn) => {
      btn.onclick = () => {
        openHireModal(btn.dataset.id);
      };
    });

    // Invite
    document.querySelectorAll(".invite-btn").forEach((btn) => {
      btn.onclick = () => openInviteModal(btn.dataset.id);
    });
  }

  searchInput.addEventListener("input", performSearch);
  searchBtn.addEventListener("click", performSearch);

  // Initial load
  performSearch();
}

function openInviteModal(freelancerId) {
  // Remove old modal if exists
  const oldModal = document.querySelector(".modal-overlay");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.classList.add("modal-overlay");

  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close">&times;</button>
      <h3>Invite Freelancer</h3>

      <form id="invite-form">
        <label>Project Title</label>
        <input type="text" name="title" placeholder="Enter project title" required />

        <label>Project Description</label>
        <textarea name="description" rows="3" placeholder="Let the Freelancer Know about what the Project is, such as His role, time frame, current project state..."></textarea>

        <label>Message</label>
        <textarea name="message" rows="3" placeholder="Write your invitation message"></textarea>

        <button type="submit" class="btn btn-primary">Send Invitation</button>
      </form>

      <div id="invite-msg" style="margin-top:10px;"></div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "flex";

  // Close events
  modal.querySelector(".modal-close").onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  const form = document.getElementById("invite-form");
  const msg = document.getElementById("invite-msg");

  form.onsubmit = async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const projectTitle = form.title.value.trim();
    const projectDescription = form.description.value.trim();
    const message = form.message.value.trim();

    if (!projectTitle) {
      msg.textContent = "Project title is required.";
      msg.style.color = "red";
      return;
    }

    try {
      showLoader();
      await fetchWithAuth(`${BASE_URL}/client/invite-freelancer`, {
        method: "POST",
        body: JSON.stringify({
          freelancerId,
          projectTitle,
          projectDescription,
          message,
        }),
      });
      hideLoader();

      msg.textContent = "✅ Invitation sent successfully!";
      msg.style.color = "green";

      setTimeout(() => {
        modal.remove();
      }, 800);
    } catch (err) {
      hideLoader();
      console.error(err);
      msg.textContent = err.message || "Failed to send invitation";
      msg.style.color = "red";
    }
  };
}
