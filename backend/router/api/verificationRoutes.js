const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middleware/authMiddleware");
const {
  uploadVerificationDocs,
} = require("../../middleware/uploadVerification");
const {
  submitVerification,
} = require("../../controllers/verificationController");

// Multipart form: front + back
router.post(
  "/submit",
  authMiddleware,
  uploadVerificationDocs.fields([
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1 },
  ]),
  submitVerification
);

module.exports = router;
