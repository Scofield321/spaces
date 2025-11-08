import { BASE_URL } from "./config.js";
import { Session } from "./session.js";

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

export async function loadPayments() {
  try {
    const content = document.getElementById("main-content");
    content.innerHTML = `<section class="card"><h3>Payments</h3><div class="results-grid" id="payments-results"></div></section>`;

    const container = document.getElementById("payments-results");
    const data = await fetchWithAuth(`${BASE_URL}/client/payments`);

    container.innerHTML = data.payments
      .map(
        (p) => `
        <div class="card payment-card">
          <h4>${p.project_title}</h4>
          <p>Freelancer: ${p.freelancer_name}</p>
          <p>Amount: $${p.amount}</p>
          <p>Status: ${p.status}</p>
          <p>Date: ${new Date(p.payment_date).toLocaleDateString()}</p>
        </div>
      `
      )
      .join("");
  } catch (err) {
    console.error(err);
  }
}
