// freelancer-notifications.js
import { BASE_URL } from "./config.js";
import { Session } from "./session.js";

// ---------- API Helper ----------
async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    Authorization: `Bearer ${Session.token()}`,
  };
  const res = await fetch(url, options);
  if (!res.ok) throw new Error((await res.json()).msg || "API Error");
  return res.json();
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

// ---------- Fetch and display notifications ----------
export async function loadNotifications() {
  const content = document.getElementById("main-content");

  try {
    const data = await fetchWithAuth(`${BASE_URL}/freelancer/notifications`);
    const notifications = data.notifications || [];

    // ✅ Update unread badge
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

    // Mark as read button logic
    document.querySelectorAll(".mark-read-btn").forEach((btn) => {
      btn.onclick = async () => {
        const li = btn.closest(".notification-item");
        const id = li.dataset.id;

        try {
          await fetchWithAuth(
            `${BASE_URL}/freelancer/notifications/${id}/mark-read`,
            { method: "POST" }
          );

          li.classList.remove("unread");
          btn.textContent = "Read";
          btn.disabled = true;

          // Refresh badge count
          const updated = await fetchWithAuth(
            `${BASE_URL}/freelancer/notifications`
          );
          updateNotificationBadge(updated.notifications);
        } catch (err) {
          console.error("Error marking notification read:", err);
        }
      };
    });
  } catch (err) {
    console.error("Error loading notifications:", err);
    content.innerHTML = "<p>Error loading notifications.</p>";
  }
}

// ---------- Optional Toast ----------
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

// ====Helper for notificstions ======

export async function fetchAndUpdateUnreadNotifications() {
  try {
    const data = await fetchWithAuth(`${BASE_URL}/freelancer/notifications`);
    const notifications = data.notifications || [];
    updateNotificationBadge(notifications);
  } catch (err) {
    console.warn("Could not fetch unread notifications:", err);
  }
}
