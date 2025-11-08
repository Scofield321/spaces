const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middleware/authMiddleware");
const role = require("../../middleware/roleMiddleware");
const {
  addReview,
  getReviewsByFreelancer,
} = require("../../controllers/freelancerReviewController");

// Add a review (client only)
router.post("/", authMiddleware, role(["client"]), addReview);

// Get all reviews for a freelancer (any authenticated user)
router.get("/:freelancerId", authMiddleware, getReviewsByFreelancer);

module.exports = router;
