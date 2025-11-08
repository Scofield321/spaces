const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { authMiddleware } = require("../../middleware/authMiddleware");
const role = require("../../middleware/roleMiddleware");
const {
  getProfile,
  updateProfile,
  getProfileById,
  addSkill,
  removeSkill,
  addProject,
  removeProject,
  uploadProfilePicture,
  uploadPortfolioImages,
  deletePortfolioImage,
} = require("../../controllers/freelancerProfileController");

router.get("/", authMiddleware, role(["freelancer"]), getProfile);
// GET /freelancers/:id - read-only profile (for clients & admins)
router.get("/:id", authMiddleware, role(["client", "admin"]), getProfileById);
router.put("/", authMiddleware, role(["freelancer"]), updateProfile);

router.post("/skills", authMiddleware, role(["freelancer"]), addSkill);
router.delete("/skills/:id", authMiddleware, role(["freelancer"]), removeSkill);

router.post("/projects", authMiddleware, role(["freelancer"]), addProject);
router.delete(
  "/projects/:id",
  authMiddleware,
  role(["freelancer"]),
  removeProject
);

// apload profile picture
router.post(
  "/profile-picture",
  authMiddleware,
  role(["freelancer"]),
  upload.single("profile_picture"),
  uploadProfilePicture
);

// Project Images Upload
router.post(
  "/upload-project-images",
  authMiddleware,
  role(["freelancer"]),
  upload.array("files"),
  uploadPortfolioImages
);

router.delete(
  "/portfolio/delete",
  authMiddleware,
  role(["freelancer"]),
  deletePortfolioImage
);

module.exports = router;
