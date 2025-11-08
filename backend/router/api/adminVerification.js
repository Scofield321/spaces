const express = require("express");
const router = express.Router();
const { adminAuth } = require("../../middleware/authMiddleware"); // middleware to ensure admin access
const {
  listPendingVerifications,
  approveVerification,
  rejectVerification,
  getAllVerifications,
} = require("../../controllers/verificationController");

// Get all pending verifications
router.get("/pending", adminAuth, listPendingVerifications);

// Approve a verification
router.post("/approve/:id", adminAuth, approveVerification);

// Reject a verification with reason
router.post("/reject/:id", adminAuth, rejectVerification);

router.get("/all", adminAuth, adminAuth, getAllVerifications);

module.exports = router;
