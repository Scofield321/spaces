const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const {
  raiseDispute,
  getDisputes,
  resolveDispute,
  getEvidence,
  getUsersForDispute,
  updateDisputeStatus,
} = require("../../controllers/disputeController.js");
const {
  authMiddleware,
  adminAuth,
} = require("../../middleware/authMiddleware.js");

router.post("/", authMiddleware, upload.array("attachments"), raiseDispute);
router.get("/", authMiddleware, getDisputes);
router.get("/:id/evidence", authMiddleware, getEvidence);
router.patch("/:id", authMiddleware, adminAuth, resolveDispute);
router.get("/users/for-dispute", authMiddleware, getUsersForDispute);
router.put("/:id/resolve", authMiddleware, adminAuth, updateDisputeStatus);

module.exports = router;
