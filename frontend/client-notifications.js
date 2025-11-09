// client-notifications.js
import { BASE_URL, SOCKET_URL } from "./config.js";
import { Session } from "./session.js";
import { showLoader, hideLoader } from "./loader.js";

// ---------- API Helper ----------
async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    Authorization: `Bearer ${Session.token()}`,
  };

  showLoader();
  try {
    const res = await fetch(url, options);
    if (!res.ok)
      throw new Error(
        (await res.json()).msg || "Something Wrong Happened, Try Again"
      );
    return res.json();
  } finally {
    hideLoader();
  }
}

// Helper for notifications alert
export async function fetchAndUpdateUnreadNotifications() {
  try {
    const data = await fetchWithAuth(`${BASE_URL}/client/notifications`);
    updateNotificationBadge(data.notifications || []);
  } catch (err) {
    console.warn("Could not fetch notification count:", err);
  }
}

// 🔔 Update notification badge
function updateNotificationBadge(notifications) {
  const badge = document.getElementById("notif-badge");
  if (!badge) return;

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.style.display = "inline-flex";
    // Trigger pop animation
    badge.classList.remove("pop"); // reset
    void badge.offsetWidth; // force reflow
    badge.classList.add("pop");
  } else {
    badge.style.display = "none";
  }
}

// ---------- Load Notifications ----------
export async function loadNotifications() {
  const content = document.getElementById("main-content");

  try {
    const data = await fetchWithAuth(`${BASE_URL}/client/notifications`);
    const notifications = data.notifications || [];

    // Update unread badge immediately
    updateNotificationBadge(notifications);

    if (!notifications.length) {
      content.innerHTML = `<section class="card"><p>No notifications yet.</p></section>`;
      return;
    }

    content.innerHTML = `
      <section class="card notifications-card">
        <div class="section-header">
          <h3>Notifications</h3>
        </div>

        <ul class="notification-list">
        ${notifications
          .map((n) => {
            const extra =
              n.extra_data && typeof n.extra_data === "string"
                ? JSON.parse(n.extra_data)
                : n.extra_data || {};

            return `
              <li class="notification-item ${
                n.read ? "read" : "unread"
              }" data-id="${n.id}">
                <div class="notification-icon"><span class="dot"></span></div>
                <div class="notification-info">
                  <h4>${n.type.replace(/_/g, " ")}</h4>
                  <p>${n.message}</p>
                  <small>${new Date(n.created_at).toLocaleString()}</small>

                  <div class="notification-actions">
                    ${
                      n.type === "freelancer_accepted_project" &&
                      extra.freelancer_email
                        ? `<button class="btn-outline-xs view-email-btn" data-email="${extra.freelancer_email}">View Email</button>`
                        : ""
                    }
                    ${
                      n.read
                        ? `<span class="badge-read">Read</span>`
                        : `<button class="btn-xs mark-read-btn">Mark as Read</button>`
                    }
                  </div>
                </div>
              </li>`;
          })
          .join("")}
        </ul>
      </section>
    `;

    // View Email popup
    document.querySelectorAll(".view-email-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const email = btn.dataset.email;
        showEmailModal(email);
      });
    });

    // Mark notification as read
    document.querySelectorAll(".mark-read-btn").forEach((btn) => {
      btn.onclick = async () => {
        const li = btn.closest(".notification-item");
        const id = li.dataset.id;

        try {
          showLoader();
          await fetchWithAuth(
            `${BASE_URL}/client/notifications/${id}/mark-read`,
            {
              method: "POST",
            }
          );

          li.classList.remove("unread");
          btn.textContent = "Read";
          btn.disabled = true;

          // Refresh badge count
          const updated = await fetchWithAuth(
            `${BASE_URL}/client/notifications`
          );
          updateNotificationBadge(updated.notifications);
        } catch (err) {
          console.error("Error marking notification read:", err);
          alert("Failed to mark as read.");
        } finally {
          hideLoader();
        }
      };
    });
  } catch (err) {
    console.error("Error loading notifications:", err);
    content.innerHTML = "<p>Error loading notifications.</p>";
  }
}

// ---------- Email Modal ----------
function showEmailModal(email) {
  const existing = document.getElementById("email-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "email-modal";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal email-modal-box">
      <button class="modal-close">&times;</button>
      <h3>Freelancer Email</h3>
      
      <p class="email-text">${email}</p>

      <div class="modal-actions">
        <button class="copy-email-btn">Copy Email</button>
        <a href="mailto:${email}" class="email-send-btn">Send Email</a>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".modal-close").onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  modal.querySelector(".copy-email-btn").onclick = () => {
    navigator.clipboard.writeText(email);
    showToast("Email copied!");
  };
}

// ---------- Toast ----------
function showToast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);

  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => {
    el.classList.remove("show");
    el.remove();
  }, 2500);
}
