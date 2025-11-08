const express = require("express");
const router = express.Router();
const { adminAuth } = require("../../middleware/authMiddleware");
const role = require("../../middleware/roleMiddleware");

const {
  getOverview,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../../controllers/adminController");

// Overview
router.get("/overview", adminAuth, role(["admin"]), getOverview);

// Users CRUD
router.get("/users", adminAuth, role(["admin"]), getAllUsers);
router.get("/users/:id", adminAuth, role(["admin"]), getUserById);
router.put("/users/:id", adminAuth, role(["admin"]), updateUser);
router.delete("/users/:id", adminAuth, role(["admin"]), deleteUser);

module.exports = router;
