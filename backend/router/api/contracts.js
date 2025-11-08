const express = require("express");
const router = express.Router();
const {
  createContract,
  acceptContract,
  declineContract,
  fundEscrow,
  getContracts,
  getContractById,
} = require("../../controllers/contractsController");
const { authMiddleware } = require("../../middleware/authMiddleware");

// ---------------- CLIENT ROUTES ----------------
router.post("/create", authMiddleware, createContract);
router.patch("/:contractId/fund-escrow", authMiddleware, fundEscrow);
router.get("/", authMiddleware, getContracts);

// ---------------- Get single contract ----------------
router.get("/:contractId", authMiddleware, getContractById);

// ---------------- FREELANCER ROUTES ----------------
router.patch("/:contractId/accept", authMiddleware, acceptContract);
router.patch("/:contractId/decline", authMiddleware, declineContract);

module.exports = router;
