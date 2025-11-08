import { BASE_URL } from "./config.js";

// -----------------------------
// Toast
// -----------------------------
function showToast(message, type = "success", duration = 3000) {
  let container = document.querySelector("#toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.background = type === "success" ? "#28a745" : "#dc3545";
  toast.style.color = "#fff";
  toast.style.padding = "10px 16px";
  toast.style.marginTop = "8px";
  toast.style.borderRadius = "6px";
  toast.style.fontSize = "14px";
  toast.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  toast.style.transition = "opacity 0.3s ease";

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// -----------------------------
// Loader
// -----------------------------
function setLoading(button, loading = true) {
  if (!button) return;
  if (loading) {
    button.disabled = true;
    button.dataset.text = button.textContent;
    button.innerHTML = `<span class="loader"></span>`;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.text;
  }
}

// -----------------------------
// Password Toggle
// -----------------------------
function addPasswordToggle(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const container = document.createElement("div");
  container.className = "password-container";
  input.parentNode.insertBefore(container, input);
  container.appendChild(input);

  const eye = document.createElement("span");
  eye.className = "toggle-password";
  eye.textContent = "👁️";
  container.appendChild(eye);

  eye.addEventListener("click", () => {
    if (input.type === "password") {
      input.type = "text";
      eye.textContent = "🙈";
    } else {
      input.type = "password";
      eye.textContent = "👁️";
    }
  });
}

// -----------------------------
// Main
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("create-account-form");
  const roleSelect = document.getElementById("role");
  const clientTypeGroup = document.getElementById("client-type-group");

  // Add password toggles
  addPasswordToggle("password");
  addPasswordToggle("confirm-password");

  // Toggle client type field based on role
  roleSelect.addEventListener("change", () => {
    clientTypeGroup.style.display =
      roleSelect.value === "client" ? "block" : "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type='submit']");
    setLoading(btn, true);

    const first_name = document.getElementById("firstname").value.trim();
    const last_name = document.getElementById("lastname").value.trim();
    const email = document.getElementById("email").value.trim();
    const country = document.getElementById("country").value.trim();
    const role = document.getElementById("role").value;
    const clientType = document.getElementById("client-type").value || null;
    const password = document.getElementById("password").value;
    const confirm_password = document.getElementById("confirm-password").value;

    if (
      !first_name ||
      !last_name ||
      !email ||
      !country ||
      !role ||
      !password ||
      !confirm_password
    ) {
      showToast("Please fill in all required fields", "error");
      setLoading(btn, false);
      return;
    }
    if (password !== confirm_password) {
      showToast("Passwords do not match", "error");
      setLoading(btn, false);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name,
          last_name,
          email,
          country,
          role,
          clientType,
          password,
          confirm_password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Registration failed");

      showToast("Account created! Please verify your email.", "success");
      form.style.display = "none";

      // OTP UI
      const otpContainer = document.createElement("div");
      otpContainer.id = "otp-container";
      otpContainer.innerHTML = `
        <h2>Enter OTP sent to your email</h2>
        <input type="text" id="otp" placeholder="6-digit OTP" maxlength="6" />
        <button id="verify-otp-btn">Verify</button>
        <button id="resend-otp-btn" style="margin-left:10px">Resend OTP</button>
      `;
      document.querySelector(".auth-card").appendChild(otpContainer);

      const otpInput = document.getElementById("otp");
      const verifyBtn = document.getElementById("verify-otp-btn");
      const resendBtn = document.getElementById("resend-otp-btn");

      otpInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") verifyBtn.click();
      });

      // Verify OTP
      verifyBtn.addEventListener("click", async () => {
        setLoading(verifyBtn, true);
        try {
          const otp = otpInput.value.trim();
          if (!otp) return showToast("Please enter the OTP", "error");

          const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok)
            throw new Error(verifyData.msg || "OTP verification failed");
          showToast(
            verifyData.msg || "Email verified! Redirecting...",
            "success"
          );
          setTimeout(() => (window.location.href = "login.html"), 1500);
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          setLoading(verifyBtn, false);
        }
      });

      // Resend OTP
      resendBtn.addEventListener("click", async () => {
        setLoading(resendBtn, true);
        try {
          const res = await fetch(`${BASE_URL}/auth/resend-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.msg || "Failed to resend OTP");
          showToast(data.msg, "success");
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          setLoading(resendBtn, false);
        }
      });
    } catch (err) {
      console.error("Registration error:", err);
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setLoading(btn, false);
    }
  });
});

// -----------------------------
// Load Countries
// -----------------------------
async function loadCountries() {
  const countrySelect = document.getElementById("country");
  try {
    const res = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,cca2"
    );
    const countries = await res.json();
    countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
    countrySelect.innerHTML =
      '<option value="" disabled selected>Select your country</option>';
    countries.forEach((c) => {
      const option = document.createElement("option");
      option.value = c.name.common;
      option.textContent = c.name.common;
      countrySelect.appendChild(option);
    });
  } catch (err) {
    console.error(err);
    countrySelect.innerHTML =
      '<option value="" disabled selected>Failed to load countries</option>';
  }
}
loadCountries();
