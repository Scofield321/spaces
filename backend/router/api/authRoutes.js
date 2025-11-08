const express = require("express");
const router = express.Router();
const {
  register,
  login,
  resendOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
} = require("../../controllers/authController");

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);

// Forgot password routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
