import { BASE_URL } from "./config.js";
import { Session } from "./session.js";
import { loadSearchFreelancers } from "./client-search.js";

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

// Load a freelancer profile (read-only for clients)
export async function loadFreelancerProfile(freelancerId) {
  if (!freelancerId) return alert("Freelancer ID is missing");

  const content = document.getElementById("main-content");
  content.innerHTML = `<p>Loading profile...</p>`;

  try {
    const data = await fetchWithAuth(
      `${BASE_URL}/freelancer/profile/${freelancerId}`
    );
    const { user, skills, projects } = data;

    content.innerHTML = `
      <section class="profile-section">
        <!-- Back Button -->
        <button id="back-to-applicants" class="btn btn-outline-secondary" style="margin-bottom: 10px;">
          ← Back to Applicants
        </button>

        <div class="profile-header">
          <h2>${user.first_name} ${user.last_name}</h2>
          ${
            user.profile_picture
              ? `<img src="${user.profile_picture}" alt="Profile" />`
              : ""
          }
        </div>

        <div class="contact-section">
          <button id="copy-email-btn" class="btn btn-sm btn-outline-primary">Copy Email</button>
        </div>

        <div class="skills-section">
          <h3>Skills</h3>
          <ul>${skills.map((s) => `<li>${s.skill_name}</li>`).join("")}</ul>
        </div>

        <div class="projects-section">
          <h3>Portfolio Projects</h3>
          <ul>
            ${projects
              .map(
                (p) =>
                  `<li><strong>${p.title}</strong> - ${p.description} ${
                    p.link ? `<a href="${p.link}" target="_blank">Link</a>` : ""
                  }</li>`
              )
              .join("")}
          </ul>
        </div>
      </section>

      <div class="reviews-section">
        <h3>Leave a Review</h3>
        <input type="number" id="review-rating" min="1" max="5" placeholder="Rating (1-5)" />
        <textarea id="review-text" placeholder="Write a comment"></textarea>
        <button id="submit-review-btn" class="btn btn-primary">Submit Review</button>
        <div id="reviews-list"></div>
      </div>
    `;

    // ---------- Back Button ----------
    document.getElementById("back-to-applicants").onclick = () => {
      loadSearchFreelancers(); // Go back to freelancer search
    };

    // ---------- Copy Email ----------
    document.getElementById("copy-email-btn").addEventListener("click", () => {
      navigator.clipboard
        .writeText(user.email)
        .then(() =>
          alert(`Freelancer email copied to clipboard: ${user.email}`)
        )
        .catch(() => alert("Failed to copy email"));
    });

    // ---------- Load and Submit Reviews ----------
    const reviewsList = document.getElementById("reviews-list");

    async function loadReviews() {
      const data = await fetchWithAuth(
        `${BASE_URL}/freelancer/reviews/${freelancerId}`
      );
      if (data.reviews.length) {
        reviewsList.innerHTML = data.reviews
          .map(
            (r) => `<div class="review">
                 <strong>${r.client_first_name} ${r.client_last_name}</strong> 
                 - ${r.rating} ★
                 <p>${r.review_text}</p>
                 <small>${new Date(r.created_at).toLocaleDateString()}</small>
               </div>`
          )
          .join("");
      } else {
        reviewsList.innerHTML = "<p>No reviews yet.</p>";
      }
    }
    loadReviews();

    document.getElementById("submit-review-btn").onclick = async () => {
      const rating = parseInt(document.getElementById("review-rating").value);
      const review_text = document.getElementById("review-text").value.trim();

      if (!rating || rating < 1 || rating > 5)
        return alert("Enter a valid rating (1-5)");

      await fetchWithAuth(`${BASE_URL}/freelancer/reviews`, {
        method: "POST",
        body: JSON.stringify({
          freelancer_id: freelancerId,
          rating,
          review_text,
        }),
      });

      document.getElementById("review-rating").value = "";
      document.getElementById("review-text").value = "";
      loadReviews();
    };
  } catch (err) {
    console.error(err);
    content.innerHTML = `<p>Error loading freelancer profile.</p>`;
  }
}
