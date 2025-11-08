import { BASE_URL } from "./config.js";
import { Session } from "./session.js";

// -----------------------------
// Toast Notification
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
// Loader Toggle
// -----------------------------
function setLoading(button, loading = true) {
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
// Login Form
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  addPasswordToggle("password");
  const form = document.getElementById("login-form");
  const loginBtn = form.querySelector("button.primary-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!email || !password) return showToast("Fill all fields", "error");

    setLoading(loginBtn, true);
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.error.includes("Email not verified")) {
          showToast(data.error, "error");
          showOtpVerification(email);
          return;
        }
        throw new Error(data.error || "Login failed");
      }

      Session.set({ token: data.token, user: data.user });
      showToast("Login successful!", "success");
      setTimeout(() => {
        window.location.href =
          data.user.role === "admin"
            ? "admin-dashboard.html"
            : data.user.role === "freelancer"
            ? "freelancer-dashboard.html"
            : data.user.role === "client"
            ? "client-dashboard.html"
            : "index.html";
      }, 1000);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(loginBtn, false);
    }
  });
});

// -----------------------------
// OTP Verification
// -----------------------------
function showOtpVerification(email) {
  const form = document.getElementById("login-form");
  form.style.display = "none";

  const otpContainer = document.createElement("div");
  otpContainer.id = "otp-container";
  otpContainer.innerHTML = `
    <h2>Enter OTP sent to your email</h2>
    <input type="text" id="otp" placeholder="6-digit OTP" maxlength="6" />
    <button id="verify-otp-btn">Verify</button>
  `;
  document.querySelector(".auth-card").appendChild(otpContainer);

  const verifyBtn = document.getElementById("verify-otp-btn");
  verifyBtn.addEventListener("click", async () => {
    const otp = document.getElementById("otp").value.trim();
    if (!otp) return showToast("Enter OTP", "error");

    setLoading(verifyBtn, true);
    try {
      const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "OTP verification failed");
      showToast(data.msg || "Email verified!", "success");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(verifyBtn, false);
    }
  });
}

// -----------------------------
// Password Reset Flow
// -----------------------------
addPasswordToggle("fp-new-password");

document
  .getElementById("forgot-password-link")
  .addEventListener("click", showForgotPasswordForm);

function showForgotPasswordForm() {
  document.getElementById("login-form").style.display = "none";

  const container = document.createElement("div");
  container.id = "forgot-password-container";
  container.innerHTML = `
    <h2>Forgot Password</h2>
    <input type="email" id="fp-email" placeholder="Your email" />
    <button id="send-otp-btn">Send OTP</button>
    <div id="otp-verification-section" style="display:none">
      <input type="text" id="fp-otp" placeholder="Enter OTP" maxlength="6" />
      <input type="password" id="fp-new-password" placeholder="New password" />
      <button id="reset-password-btn">Reset Password</button>
    </div>
  `;
  document.querySelector(".auth-card").appendChild(container);

  document
    .getElementById("send-otp-btn")
    .addEventListener("click", sendResetOtp);
  document
    .getElementById("reset-password-btn")
    .addEventListener("click", resetPassword);
}

async function sendResetOtp() {
  const btn = document.getElementById("send-otp-btn");
  setLoading(btn, true);

  const email = document.getElementById("fp-email").value.trim();
  if (!email) return showToast("Enter email", "error");

  try {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.msg || "Failed");
    showToast("OTP sent!", "success");
    document.getElementById("otp-verification-section").style.display = "block";
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(btn, false);
  }
}

async function resetPassword() {
  const btn = document.getElementById("reset-password-btn");
  setLoading(btn, true);

  const email = document.getElementById("fp-email").value.trim();
  const otp = document.getElementById("fp-otp").value.trim();
  const newPassword = document.getElementById("fp-new-password").value.trim();

  if (!otp || !newPassword) return showToast("Fill all fields", "error");

  try {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to reset");
    showToast("Password reset successful!", "success");
    setTimeout(() => window.location.reload(), 1000);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(btn, false);
  }
}
