import { BASE_URL } from "./config.js";
import { Session } from "./session.js";

// ---------- API Helper ----------
export async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    Authorization: `Bearer ${Session.token()}`,
  };
  const res = await fetch(url, options);
  if (!res.ok) throw new Error((await res.json()).msg || "API Error");
  return res.json();
}

document.addEventListener("DOMContentLoaded", () => {
  const user = Session.user();

  // Check if user exists
  if (user) {
    const firstName = user.first_name || "";
    const lastInitial = user.last_name ? user.last_name.charAt(0) : "";

    // Set the profile element
    const profileEl = document.getElementById("client-name");
    if (profileEl) {
      profileEl.textContent = `${firstName} ${lastInitial}.`;
    }
  } else {
    console.warn("No user is currently logged in.");
  }
});
