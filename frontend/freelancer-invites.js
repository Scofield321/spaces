import { BASE_URL } from "./config.js";
import { Session } from "./session.js";
import { showLoader, hideLoader } from "./loader.js";

// ---------- Helper: fetch with auth ----------
async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    Authorization: `Bearer ${Session.token()}`,
  };
  const res = await fetch(url, options);
  if (!res.ok)
    throw new Error(
      (await res.json()).message || "Something Wrong Happened, Try Again"
    );
  return res.json();
}

export async function loadFreelancerInvites() {
  const content = document.getElementById("main-content");

  content.innerHTML = `
    <h2>Project Invitations</h2>
    <div id="invites-list" class="card-list"></div>
  `;

  const list = document.getElementById("invites-list");
  showLoader();
  try {
    const res = await fetchWithAuth(`${BASE_URL}/freelancer/invites`);
    const invites = res.invites;

    if (!invites.length) {
      list.innerHTML = `<p>No invitations yet.</p>`;
      return;
    }

    list.innerHTML = invites
      .map((i) => {
        const isAccepted = i.status === "accepted";

        return `
        <div class="card invite-card">
          <h3>${i.project_title}</h3>
          <p>${i.project_description || "No description provided"}</p>
          
          <p><strong>Client Message:</strong><br>
          ${i.message || "No message provided"}</p>

          <div class="small-info">
          <strong>Client:</strong> 
          ${i.client_name}
          ${
            i.client_verified
              ? `
            <span class="verified-wrapper">
              <svg class="verified-icon" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="#1DA1F2"></circle>
                <path d="M17 9l-6.5 6L7 11.5"
                  stroke="#fff" stroke-width="2.2" fill="none"
                  stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          `
              : ""
          }
          <br>
          
            <strong>Email:</strong> <a href="mailto:${i.client_email}">${
          i.client_email
        }</a><br>
            <strong>Status:</strong> 
              <span class="status-badge ${isAccepted ? "accepted" : "pending"}">
                ${i.status}
              </span>
          </div>

          <div class="actions-row">
            ${
              isAccepted
                ? `<span class="badge">✅ You accepted this invitation</span>`
                : `
              <button class="btn btn-success accept-btn" data-id="${i.contract_id}">Accept</button>
              <button class="btn btn-danger decline-btn" data-id="${i.contract_id}">Decline</button>
              `
            }
          </div>
        </div>
      `;
      })
      .join("");

    // ✅ Accept
    btn.onclick = async () => {
      try {
        showLoader(); // ✅ show loader while accepting
        await fetchWithAuth(
          `${BASE_URL}/freelancer/invite/${btn.dataset.id}/accept`,
          {
            method: "POST",
          }
        );
        alert("✅ Invitation accepted");
        loadFreelancerInvites();
      } finally {
        hideLoader(); // ✅ hide loader after accept completes
      }
    };

    // ✅ Decline
    document.querySelectorAll(".decline-btn").forEach((btn) => {
      btn.onclick = async () => {
        const reason = prompt("Why are you declining this invitation?")?.trim();
        if (!reason) return alert("Reason cannot be empty");

        try {
          showLoader(); // ✅ show loader while declining
          await fetchWithAuth(
            `${BASE_URL}/freelancer/invite/${btn.dataset.id}/decline`,
            {
              method: "POST",
              body: JSON.stringify({ reason }),
            }
          );
          alert("❌ Invitation declined");
          loadFreelancerInvites();
        } catch (e) {
          console.error(e);
          alert("Failed to decline invitation");
        } finally {
          hideLoader(); // ✅ hide loader after decline completes
        }
      };
    });
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="error">Failed to load invitations</p>`;
  } finally {
    hideLoader(); // ✅ hide loader after fetch finishes or fails
  }
}
