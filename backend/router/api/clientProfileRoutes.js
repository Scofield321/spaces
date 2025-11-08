const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { authMiddleware } = require("../../middleware/authMiddleware");
const role = require("../../middleware/roleMiddleware");
const {
  getProfile,
  getProfileById,
  updateProfile,
  uploadProfilePicture,
} = require("../../controllers/clientProfileController");

router.get("/", authMiddleware, role(["client"]), getProfile);
router.get(
  "/:id",
  authMiddleware,
  role(["freelancer", "admin"]),
  getProfileById
);
router.put("/", authMiddleware, role(["client"]), updateProfile);
router.post(
  "/profile-picture",
  authMiddleware,
  upload.single("profile_picture"),
  uploadProfilePicture
);

module.exports = router;
