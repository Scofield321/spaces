const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const {
  submitVerification,
  getUserVerification,
} = require("../../controllers/verificationController");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { ensureBody } = require("../../middleware/ensureBody");

// Submit verification (freelancer)
router.post(
  "/submit",
  authMiddleware,
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1 },
  ]),
  ensureBody,
  async (req, res) => {
    req.body.user_role = "freelancer";
    await submitVerification(req, res);
  }
);

// Get current freelancer verification
router.get("/me", authMiddleware, async (req, res) => {
  await getUserVerification(req, res);
});

module.exports = router;
