const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middleware/authMiddleware");
const role = require("../../middleware/roleMiddleware");
const {
  getAvailableJobs,
  applyJob,
  getMyProjects,
  getPayments,
  getAssignedProjects,
  acceptProject,
  declineProject,
  getFreelancerInvites,
  acceptInvite,
  declineInvite,
  getFreelancerStats,
  getFreelancerApplications,
  getFreelancerNotifications,
  markNotificationRead,
} = require("../../controllers/freelancerController");

// ---------- Freelancer Routes ----------
router.get("/jobs", authMiddleware, role(["freelancer"]), getAvailableJobs);
router.post("/apply", authMiddleware, role(["freelancer"]), applyJob);
router.get(
  "/assigned-projects",
  authMiddleware,
  role(["freelancer"]),
  getAssignedProjects
);
router.get("/my-projects", authMiddleware, role(["freelancer"]), getMyProjects);
router.get("/payments", authMiddleware, role(["freelancer"]), getPayments);

// Accept project
router.post(
  "/accept-project",
  authMiddleware,
  role(["freelancer"]),
  acceptProject
);

// Decline project
router.post(
  "/decline-project",
  authMiddleware,
  role(["freelancer"]),
  declineProject
);

//Get the Invitations
router.get(
  "/invites",
  authMiddleware,
  role(["freelancer"]),
  getFreelancerInvites
);

// Accept the Invitation
router.post(
  "/invite/:contractId/accept",
  authMiddleware,
  role(["freelancer"]),
  acceptInvite
);

// Decline the invitation
router.post(
  "/invite/:contractId/decline",
  authMiddleware,
  role(["freelancer"]),
  declineInvite
);

// stats
router.get("/stats", authMiddleware, role(["freelancer"]), getFreelancerStats);

// recent applications
router.get(
  "/recent-applications",
  authMiddleware,
  role(["freelancer"]),
  getFreelancerApplications
);

// Notifcations
router.get(
  "/notifications",
  authMiddleware,
  role(["freelancer"]),
  getFreelancerNotifications
);

// mark as read

router.post(
  "/notifications/:id/mark-read",
  authMiddleware,
  role(["freelancer"]),
  markNotificationRead
);

module.exports = router;
