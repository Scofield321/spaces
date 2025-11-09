import { BASE_URL } from "./config.js";
import { Session } from "./session.js";
import { showLoader, hideLoader } from "./loader.js";

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

/* ================== Manage Projects ================== */
export async function loadManageProjects() {
  try {
    const content = document.getElementById("main-content");
    content.innerHTML = `
      <section class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3>Manage Projects</h3>
          <button class="btn" id="postProjectBtn">+ Post Project</button>
        </div>
        <div class="results-grid" id="projects-results"></div>
      </section>
    `;

    document.getElementById("postProjectBtn").onclick = () =>
      openPostProjectModal();

    const container = document.getElementById("projects-results");
    const data = await fetchWithAuth(`${BASE_URL}/client/my-projects`);

    if (!data.projects.length) {
      container.innerHTML = `
        <p>You haven't posted any projects yet.</p>
        <button class="btn" id="firstPostBtn">Post your first Project</button>
      `;
      document.getElementById("firstPostBtn").onclick = () =>
        openPostProjectModal();
      return;
    }

    container.innerHTML = data.projects
      .map(
        (p) => `
      <div class="card project-card" data-id="${p.id}">
        <h4>${p.title}</h4>
        <p>${p.description || "-"}</p>
        <p>Budget: ${p.budget_text || "$" + p.budget}</p>
        <p>Created: ${new Date(p.created_at).toLocaleDateString()}</p>

        <div class="project-actions">
          <button class="btn edit-project-btn" data-id="${p.id}">Edit</button>
          <button class="btn delete-project-btn" data-id="${
            p.id
          }">Delete</button>
        </div>
      </div>`
      )
      .join("");

    attachProjectActions();
  } catch (err) {
    console.error(err);
    alert("Error loading projects.");
  }
}

/* ---------------- Post Project Modal ---------------- */
function openPostProjectModal() {
  const old = document.querySelector(".modal-overlay");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.classList.add("modal-overlay");
  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close">&times;</button>
      <h3>Post a New Project</h3>
      <form id="post-project-form">
        <label>Project Title</label>
        <input type="text" name="title" placeholder="Enter project title" required />

        <label>Category</label>
        <input type="text" name="category" placeholder="Web Dev, Design, etc" />

        <label>Description</label>
        <textarea name="description" placeholder="Describe your project" rows="5"></textarea>

        <label>Budget</label>
        <input type="text" name="budget" placeholder="e.g., $20/hr or 100k UGX" required />

        <button type="submit" class="btn">Post Project</button>
      </form>
      <div id="post-project-message" style="margin-top:10px;"></div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "flex";

  modal.querySelector(".modal-close").onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  const form = document.getElementById("post-project-form");
  const msg = document.getElementById("post-project-message");

  form.onsubmit = async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const title = form.title.value.trim();
    const description = form.description.value.trim();
    const budgetText = form.budget.value.trim();

    if (!title || !budgetText) {
      msg.textContent = "Title and budget are required.";
      msg.style.color = "red";
      return;
    }

    const numeric = budgetText.match(/[\d,.]+/g);
    const budgetAmount = numeric
      ? parseFloat(numeric[0].replace(/,/g, ""))
      : null;

    if (!budgetAmount) {
      msg.textContent = "Invalid budget format.";
      msg.style.color = "red";
      return;
    }

    try {
      showLoader();
      await fetchWithAuth(`${BASE_URL}/client/post-project`, {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          budget: budgetAmount,
          budget_text: budgetText,
        }),
      });
      hideLoader();

      msg.textContent = "✅ Project posted successfully!";
      msg.style.color = "green";

      setTimeout(() => {
        modal.remove();
        loadManageProjects();
      }, 800);
    } catch (err) {
      hideLoader();
      console.error(err);
      msg.textContent = err.message || "Error posting project.";
      msg.style.color = "red";
    }
  };
}

/* ---------------- Edit / Delete ---------------- */
function attachProjectActions() {
  // Edit project
  document.querySelectorAll(".edit-project-btn").forEach((btn) => {
    btn.onclick = async () => {
      try {
        showLoader();
        const projectId = btn.dataset.id;
        const res = await fetchWithAuth(
          `${BASE_URL}/client/project/${projectId}`
        );
        hideLoader();
        openEditProjectModal(res.project);
      } catch (err) {
        hideLoader();
        console.error(err);
        alert("Error fetching project data.");
      }
    };
  });

  // Delete project
  document.querySelectorAll(".delete-project-btn").forEach((btn) => {
    btn.onclick = async () => {
      const projectId = btn.dataset.id;
      if (!confirm("Are you sure you want to delete this project?")) return;

      try {
        showLoader();
        await fetchWithAuth(`${BASE_URL}/client/project/${projectId}`, {
          method: "DELETE",
        });
        hideLoader();
        alert("Project deleted successfully!");
        loadManageProjects();
      } catch (err) {
        hideLoader();
        console.error(err);
        alert("Error deleting project.");
      }
    };
  });
}

function openEditProjectModal(project) {
  const old = document.querySelector(".modal-overlay");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.classList.add("modal-overlay");
  modal.innerHTML = `
    <div class="modal">
      <button class="modal-close">&times;</button>
      <h3>Edit Project</h3>
      <form id="edit-project-form">
        <label>Project Title</label>
        <input type="text" name="title" value="${project.title}" required />

        <label>Description</label>
        <textarea name="description" rows="5">${
          project.description || ""
        }</textarea>

        <label>Budget</label>
        <input type="text" name="budget" value="${
          project.budget_text || project.budget
        }" required />

        <button class="btn" type="submit">Save Changes</button>
      </form>
      <div id="edit-project-message" style="margin-top:10px;"></div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "flex";

  modal.querySelector(".modal-close").onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  const form = document.getElementById("edit-project-form");
  const msg = document.getElementById("edit-project-message");

  form.onsubmit = async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const title = form.title.value.trim();
    const description = form.description.value.trim();
    const budgetText = form.budget.value.trim();

    const numeric = budgetText.match(/[\d,.]+/g);
    const budgetAmount = numeric
      ? parseFloat(numeric[0].replace(/,/g, ""))
      : null;

    if (!budgetAmount) {
      msg.textContent = "Invalid budget.";
      msg.style.color = "red";
      return;
    }

    try {
      showLoader();
      await fetchWithAuth(`${BASE_URL}/client/project/${project.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          description,
          budget: budgetAmount,
          budget_text: budgetText,
        }),
      });
      hideLoader();

      msg.textContent = "✅ Project updated!";
      msg.style.color = "green";

      setTimeout(() => {
        modal.remove();
        loadManageProjects();
      }, 800);
    } catch (err) {
      hideLoader();
      console.error(err);
      msg.textContent = err.message || "Error updating.";
      msg.style.color = "red";
    }
  };
}
