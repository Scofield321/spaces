import { BASE_URL } from "./config.js";
import { Session } from "./session.js";

// ---------- API Wrapper ----------
async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    Authorization: `Bearer ${Session.token()}`,
  };
  const res = await fetch(url, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.msg || "API Error");
  }
  return res.json();
}

// ---------- OVERVIEW ----------
export async function loadOverview() {
  const main = document.querySelector(".content");
  main.innerHTML = `<p class="loading">Loading overview...</p>`;

  try {
    const data = await fetchWithAuth(`${BASE_URL}/admin/overview`);

    main.innerHTML = `
      <section class="dashboard">
        <div class="kpi card">
          <h4>Total Users</h4>
          <p class="kpi-value">${data.users}</p>
        </div>
        <div class="kpi card">
          <h4>Pending Verifications</h4>
          <p class="kpi-value">${data.pendingVerifications}</p>
        </div>
        <div class="kpi card">
          <h4>Active Contracts</h4>
          <p class="kpi-value">${data.activeContracts}</p>
        </div>
      </section>
    `;
  } catch (err) {
    console.error(err);
    main.innerHTML = `<p class="error">Failed to load overview.</p>`;
  }
}

// ---------- USERS PAGE ----------
export async function loadUsers() {
  const main = document.querySelector(".content");
  main.innerHTML = `<p class="loading">Loading users...</p>`;

  try {
    const users = await fetchWithAuth(`${BASE_URL}/admin/users`);
    main.innerHTML = `
      <section class="card">
        <h3>All Users</h3>
        <div class="table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>First Name</th><th>Last Name</th><th>Email</th>
                <th>Role</th><th>Country</th><th>Client Type</th>
                <th>Verified</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users
                .map(
                  (u) => `
                <tr data-id="${u.id}">
                  <td data-label="First Name">${u.first_name}</td>
                  <td data-label="Last Name">${u.last_name}</td>
                  <td data-label="Email">${u.email}</td>
                  <td data-label="Role">${u.role}</td>
                  <td data-label="Country">${u.country || "-"}</td>
                  <td data-label="Client Type">${u.client_type || "-"}</td>
                  <td data-label="Verified">${u.verified ? "Yes" : "No"}</td>
                  <td data-label="Actions">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn danger">Delete</button>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;

    attachUserEvents();
  } catch (err) {
    console.error("Load users error", err);
    main.innerHTML = `<p class="error">Failed to load users.</p>`;
  }
}

// ---------- EVENT HANDLERS (Edit + Delete) ----------
function attachUserEvents() {
  const table = document.querySelector(".users-table tbody");
  if (!table) return;

  table.addEventListener("click", async (e) => {
    const row = e.target.closest("tr");
    if (!row) return;

    const id = row.dataset.id;

    // DELETE
    if (e.target.classList.contains("delete-btn")) {
      if (!confirm("Delete this user?")) return;
      try {
        await fetchWithAuth(`${BASE_URL}/admin/users/${id}`, {
          method: "DELETE",
        });
        loadUsers();
      } catch (err) {
        console.error(err);
        alert("Failed to delete user");
      }
    }

    // EDIT
    if (e.target.classList.contains("edit-btn")) {
      openEditModal(row);
    }
  });
}

// ---------- EDIT MODAL ----------
function openEditModal(row) {
  const modal = document.getElementById("edit-user-modal");
  modal.classList.remove("hidden");

  const data = (label) =>
    row.querySelector(`[data-label="${label}"]`)?.textContent;

  document.getElementById("edit-user-id").value = row.dataset.id;
  document.getElementById("edit-first-name").value = data("First Name");
  document.getElementById("edit-last-name").value = data("Last Name");
  document.getElementById("edit-email").value = data("Email");
  document.getElementById("edit-role").value = data("Role");
  document.getElementById("edit-country").value =
    data("Country") === "-" ? "" : data("Country");
  document.getElementById("edit-client-type").value =
    data("Client Type") === "-" ? "" : data("Client Type");
  document.getElementById("edit-verified").value = data("Verified") === "Yes";

  // Cancel
  document.getElementById("close-edit-modal").onclick = () =>
    modal.classList.add("hidden");

  // Outside click
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  };

  // Submit
  document.getElementById("edit-user-form").onsubmit = async (e) => {
    e.preventDefault();

    const payload = {
      first_name: document.getElementById("edit-first-name").value,
      last_name: document.getElementById("edit-last-name").value,
      email: document.getElementById("edit-email").value,
      role: document.getElementById("edit-role").value,
      country: document.getElementById("edit-country").value,
      client_type: document.getElementById("edit-client-type").value,
      verified: document.getElementById("edit-verified").value === "true",
    };

    try {
      await fetchWithAuth(`${BASE_URL}/admin/users/${row.dataset.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      modal.classList.add("hidden");
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to update user");
    }
  };
}
