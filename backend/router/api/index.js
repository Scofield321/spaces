const express = require("express");
const router = express.Router();

// Mount sub-routers
router.use("/auth", require("./authRoutes"));
router.use("/client", require("./clientRoutes"));
router.use("/freelancer", require("./freelancerRoutes"));
router.use("/freelancer/profile", require("./freelancerProfileRoutes"));
router.use("/freelancer/reviews", require("./freelancerReviewRoutes"));
router.use("/client/profile", require("./clientProfileRoutes"));
router.use("/admin", require("./adminRoutes"));
router.use("/contracts", require("./contracts"));
router.use("/verification", require("./verificationRoutes"));
router.use(
  "/freelancer-verification",
  require("./freelancerVerificationRoutes")
);
router.use("/client-verification", require("./clientVerificationRoutes"));
router.use("/admin/verifications", require("./adminVerification"));
router.use("/disputes", require("./disputes"));

// ✅ No catch-all here; 404 handled in server.js

module.exports = router;
