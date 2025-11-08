import { BASE_URL } from "../config.js";
import { Session } from "../session.js";

export function initUsers() {
  loadUsers();

  document.getElementById("closeModalBtn").onclick = () => {
    document.getElementById("editUserModal").style.display = "none";
  };
}

async function loadUsers() {
  const token = Session.token();
  const res = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const users = await res.json();

  const container = document.getElementById("usersContainer");
  container.innerHTML = users
    .map(
      (u) => `
    <div class="user-card">
      <p><b>${u.name}</b></p>
      <p>${u.email}</p>
      <button onclick="editUser('${u.id}')">Edit</button>
      <button onclick="deleteUser('${u.id}')">Delete</button>
    </div>
  `
    )
    .join("");
}

window.editUser = (id) => {
  document.getElementById("editUserModal").style.display = "flex";
};

window.deleteUser = async (id) => {
  const token = Session.token();
  await fetch(`${BASE_URL}/admin/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  loadUsers();
};
