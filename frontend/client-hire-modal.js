import { BASE_URL } from "./config.js";
import { Session } from "./session.js";

async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type":
      options.body instanceof FormData ? undefined : "application/json",
    Authorization: `Bearer ${Session.token()}`,
  };
  const res = await fetch(url, options);
  if (!res.ok)
    throw new Error(
      (await res.json()).message || "Something Wrong Happened, Try Again"
    );
  return res.json();
}

export async function openHireModal(freelancerId) {
  // Remove existing modal
  const oldModal = document.querySelector(".modal-overlay");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.classList.add("modal-overlay");
  modal.innerHTML = `
    <div class="modal hire-modal">
      <button class="modal-close">&times;</button>
      <h2>Hire Freelancer</h2>
      <form id="hire-form">
        <!-- Freelancer ID -->
        <input type="hidden" name="freelancerId" value="${freelancerId}">

        <!-- Project Title -->
        <label>Project Title:
          <input type="text" name="projectTitle" placeholder="Enter project title" required>
        </label>

        <!-- Project Description -->
        <label>Project Description:
          <textarea name="projectDescription" rows="4" placeholder="Provide a detailed description of the project for the freelancer"></textarea>
        </label>

        <!-- Contract Type -->
        <label>Contract Type:
          <select name="type">
            <option value="fixed">Fixed</option>
            <option value="hourly">Hourly</option>
          </select>
        </label>

        <!-- Amount -->
        <label>Amount / Hourly Rate:
          <input type="number" name="amount" step="0.01" placeholder="Enter amount" required>
        </label>

        <!-- Expected Duration -->
        <label>Expected Duration (weeks/months):
          <input type="text" name="expected_duration" placeholder="e.g. 4 weeks">
        </label>

        <!-- Start Date -->
        <label>Start Date:
          <input type="date" name="start_date">
        </label>

        <!-- Work Scope -->
        <label>Work Scope (Make the Freelancer Know What Your Expections are, and Be Clear):
        <textarea name="work_scope" rows="4" 
        placeholder="Example: Design a responsive landing page with hero, services, and contact sections. Deliverables: HTML/CSS files and images. Complete within 2 weeks."></textarea>      
        </label>

        <p>Press red X button for all the fields you want to leave open, except Payment Terms</p>

        <!-- Milestones -->
        <div class="dynamic-field" id="milestones-container">
          <label>Milestones:</label>
          <div class="milestone-row">
            <input type="text" name="milestone_title[]" placeholder="Milestone title" required>
            <input type="number" name="milestone_amount[]" placeholder="Amount" required>
            <button type="button" class="btn btn-outline remove-row">✕</button>
          </div>
          <button type="button" class="btn btn-secondary add-milestone">+ Add Milestone</button>
        </div>

        <!-- Attachments -->
        <div class="dynamic-field" id="attachments-container">
          <label>Attachments:</label>
          <div class="attachment-row">
            <input type="text" name="attachment_name[]" placeholder="File name" required>
            <input type="text" name="attachment_link[]" placeholder="Link" required>
            <button type="button" class="btn btn-outline remove-row">✕</button>
          </div>
          <button type="button" class="btn btn-secondary add-attachment">+ Add Attachment</button>
        </div>

        <!-- Payment Terms -->
        <div class="dynamic-field" id="payment-terms-container">
          <label>Payment Terms:</label>
          <div class="payment-row">
            <select name="payment_type[]">
              <option value="upfront">Upfront</option>
              <option value="milestone">Milestone</option>
              <option value="final">Final</option>
            </select>
            <input type="number" name="payment_percentage[]" placeholder="Percentage" required>
            <button type="button" class="btn btn-outline remove-row">✕</button>
          </div>
          <button type="button" class="btn btn-secondary add-payment">+ Add Payment Term</button>
        </div>

        <label>
          <input type="checkbox" name="send_to_freelancer" checked>
          Send to freelancer immediately
        </label>

        <button type="submit" class="btn btn-primary">Create Contract</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "flex";

  // Close modal
  modal.querySelector(".modal-close").onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  // ---------------- Dynamic fields ----------------
  function addDynamicField(containerSelector, rowClass) {
    const container = modal.querySelector(containerSelector);
    container.querySelector(`.add-${rowClass}`).onclick = () => {
      const row = container.querySelector(`.${rowClass}-row`).cloneNode(true);
      row
        .querySelectorAll("input, select")
        .forEach((input) => (input.value = ""));
      container.insertBefore(row, container.querySelector(`.add-${rowClass}`));
      attachRemoveButtons();
    };
  }

  function attachRemoveButtons() {
    modal.querySelectorAll(".remove-row").forEach((btn) => {
      btn.onclick = () => btn.parentElement.remove();
    });
  }

  addDynamicField("#milestones-container", "milestone");
  addDynamicField("#attachments-container", "attachment");
  addDynamicField("#payment-terms-container", "payment");
  attachRemoveButtons();

  // ---------------- Form submission ----------------
  modal.querySelector("#hire-form").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;

    const getFieldData = (name) =>
      [...form.querySelectorAll(`[name="${name}[]"]`)]
        .map((input) => input.value)
        .filter((v) => v !== "");

    const payload = {
      freelancerId: form.freelancerId.value,
      projectTitle: form.projectTitle.value,
      projectDescription: form.projectDescription.value,
      type: form.type.value,
      amount: parseFloat(form.amount.value),
      expected_duration: form.expected_duration.value,
      start_date: form.start_date.value,
      work_scope: form.work_scope.value,
      milestones: getFieldData("milestone_title").map((title, i) => ({
        title,
        amount: parseFloat(getFieldData("milestone_amount")[i] || 0),
      })),
      attachments: getFieldData("attachment_name").map((name, i) => ({
        name,
        link: getFieldData("attachment_link")[i] || "",
      })),
      payment_terms: getFieldData("payment_type").map((type, i) => ({
        type,
        percentage: parseFloat(getFieldData("payment_percentage")[i] || 0),
      })),
      send_to_freelancer: form.send_to_freelancer.checked,
    };

    try {
      await fetchWithAuth(`${BASE_URL}/contracts/create`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      alert("✅ Contract created successfully!");
      modal.remove();
    } catch (err) {
      console.error(err);
      alert("Error creating contract. Check your fields.");
    }
  };
}
