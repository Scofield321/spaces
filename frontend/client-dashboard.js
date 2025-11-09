import { Session } from "./session.js";
import { showLoader, hideLoader } from "./loader.js";

// ---------- API Helper ----------
export async function fetchWithAuth(url, options = {}) {
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

// ---------- Display Client Name ----------
document.addEventListener("DOMContentLoaded", () => {
  const user = Session.user();

  if (user) {
    const firstName = user.first_name || "";
    const lastInitial = user.last_name ? user.last_name.charAt(0) : "";

    const profileEl = document.getElementById("client-name");
    if (profileEl) {
      profileEl.textContent = `${firstName} ${lastInitial}.`;
    }
  } else {
    console.warn("No user is currently logged in.");
    const profileEl = document.getElementById("client-name");
    if (profileEl) profileEl.textContent = "Guest";
  }
});
