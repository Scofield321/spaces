const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middleware/authMiddleware");
const role = require("../../middleware/roleMiddleware");

const {
  searchFreelancers,
  getClientApplications,
  getMyProjects,
  postProject,
  getSingleProject,
  editProject,
  deleteProject,
  getContracts,
  getPayments,
  hireFreelancer,
  inviteFreelancer,
  updateInvitation,
  deleteInvitation,
  getNotifications,
  markRead,
  getClientInvites,
  createNotification,
} = require("../../controllers/clientController");

router.get(
  "/search-freelancers",
  authMiddleware,
  role(["client"]),
  searchFreelancers
);
router.get("/applications", authMiddleware, getClientApplications);
router.post("/post-project", authMiddleware, role(["client"]), postProject);
router.get("/my-projects", authMiddleware, role(["client"]), getMyProjects);

router.get(
  "/project/:projectId",
  authMiddleware,
  role(["client"]),
  getSingleProject
);

router.put(
  "/project/:projectId",
  authMiddleware,
  role(["client"]),
  editProject
);
router.post(
  "/hire-freelancer",
  authMiddleware,
  role(["client"]),
  hireFreelancer
);

router.post(
  "/invite-freelancer",
  authMiddleware,
  role(["client"]),
  inviteFreelancer
);

router.get("/invites", authMiddleware, role(["client"]), getClientInvites);

router.patch(
  "/invite/:contractId/update",
  authMiddleware,
  role(["client"]),
  updateInvitation
);

router.delete(
  "/invite/:contractId/delete",
  authMiddleware,
  role(["client"]),
  deleteInvitation
);

router.delete(
  "/project/:projectId",
  authMiddleware,
  role(["client"]),
  deleteProject
);

router.get(
  "/notifications",
  authMiddleware,
  role(["client"]),
  getNotifications
);
router.post(
  "/notifications/:id/mark-read",
  authMiddleware,
  role(["client"]),
  markRead
);

router.post("/notifications/create", authMiddleware, createNotification);

router.get("/contracts", authMiddleware, role(["client"]), getContracts);
router.get("/payments", authMiddleware, role(["client"]), getPayments);

module.exports = router;
