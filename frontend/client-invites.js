import { BASE_URL } from "./config.js";
import { Session } from "./session.js";

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

export async function loadClientInvites() {
  const content = document.getElementById("main-content");

  content.innerHTML = `
    <h2>Invitations</h2>
    <div id="invites-list" class="card-list"></div>
  `;

  const list = document.getElementById("invites-list");

  try {
    const res = await fetchWithAuth(`${BASE_URL}/client/invites`);
    const invites = res.invites;

    if (!invites.length) {
      list.innerHTML = `<p>No invitations sent yet.</p>`;
      return;
    }

    list.innerHTML = invites
      .map((i) => {
        const isRejected = i.status === "rejected";
        return `
      <div class="card invite-card">
        <h3>${i.project_title}</h3>
        <p>${i.project_description || "No description provided"}</p>
        <p><strong>Your Message:</strong><br>${i.message || "No message"}</p>

        <div class="small-info">
          <strong>Freelancer:</strong> ${i.freelancer_name}<br>
          <strong>Email:</strong> <a href="mailto:${i.freelancer_email}">${
          i.freelancer_email
        }</a><br>
          <strong>Status:</strong> <span>${i.status}</span>
          ${
            isRejected && i.decline_reason
              ? `<br><strong>Reason:</strong> ${i.decline_reason}`
              : ""
          }
        </div>

        <div class="actions-row">
          <button class="btn btn-warning update-btn" data-id="${i.contract_id}" 
            data-title="${i.project_title}" 
            data-description="${i.project_description || ""}" 
            data-message="${i.message || ""}">Update</button>
          <button class="btn btn-danger delete-btn" data-id="${
            i.contract_id
          }">Delete</button>
        </div>
      </div>
    `;
      })
      .join("");

    // -------------------------
    // Update button → open modal
    // -------------------------
    document.querySelectorAll(".update-btn").forEach((btn) => {
      btn.onclick = () => {
        openUpdateInviteModal({
          contractId: btn.dataset.id,
          title: btn.dataset.title,
          description: btn.dataset.description,
          message: btn.dataset.message,
        });
      };
    });

    // Delete button
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Are you sure you want to delete this invitation?"))
          return;
        try {
          await fetchWithAuth(
            `${BASE_URL}/client/invite/${btn.dataset.id}/delete`,
            {
              method: "DELETE",
            }
          );
          alert("❌ Invitation deleted");
          loadClientInvites();
        } catch (err) {
          console.error(err);
          alert("Failed to delete invitation");
        }
      };
    });
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="error">Failed to load invitations</p>`;
  }
}

/* -------------------------------
   Modal: Update Invitation
--------------------------------*/
function openUpdateInviteModal({ contractId, title, description, message }) {
  const old = document.querySelector(".modal-overlay");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.classList.add("modal-overlay");

  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close">&times;</button>
      <h3>Update Invitation</h3>

      <form id="update-invite-form">
        <label>Project Title</label>
        <input type="text" name="title" value="${title}" required />

        <label>Project Description</label>
        <textarea name="description" rows="4">${description}</textarea>

        <label>Message</label>
        <textarea name="message" rows="3" required>${message}</textarea>

        <button type="submit" class="btn">Save Changes</button>
      </form>

      <div id="update-invite-msg" style="margin-top:10px;"></div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "flex";

  // Close handlers
  modal.querySelector(".modal-close").onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  const form = document.getElementById("update-invite-form");
  const msg = document.getElementById("update-invite-msg");

  form.onsubmit = async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const newTitle = form.title.value.trim();
    const newDescription = form.description.value.trim();
    const newMessage = form.message.value.trim();

    if (!newTitle || !newMessage) {
      msg.textContent = "Project title and message are required.";
      msg.style.color = "red";
      return;
    }

    try {
      await fetchWithAuth(`${BASE_URL}/client/invite/${contractId}/update`, {
        method: "PATCH",
        body: JSON.stringify({
          projectTitle: newTitle,
          projectDescription: newDescription,
          message: newMessage,
        }),
      });

      msg.textContent = "✅ Invitation updated successfully!";
      msg.style.color = "green";

      setTimeout(() => {
        modal.remove();
        loadClientInvites();
      }, 800);
    } catch (err) {
      console.error(err);
      msg.textContent = err.message || "Failed to update invitation";
      msg.style.color = "red";
    }
  };
}
