const pool = require("../config/db");

// Add a review
const addReview = async (req, res, next) => {
  try {
    const clientId = req.user.id;
    const { freelancer_id, project_id, rating, review_text } = req.body;

    if (!freelancer_id || !rating)
      return res
        .status(400)
        .json({ msg: "Freelancer ID and rating are required" });

    const result = await pool.query(
      `INSERT INTO freelancer_reviews 
        (freelancer_id, client_id, project_id, rating, review_text)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [freelancer_id, clientId, project_id || null, rating, review_text || ""]
    );

    // Recalculate average rating
    const avgResult = await pool.query(
      `SELECT AVG(rating)::numeric(3,2) AS avg_rating 
       FROM freelancer_reviews 
       WHERE freelancer_id=$1`,
      [freelancer_id]
    );

    const avgRating = avgResult.rows[0].avg_rating || 0;

    // Update freelancer's rating in users table
    await pool.query(`UPDATE users SET rating=$1 WHERE id=$2`, [
      avgRating,
      freelancer_id,
    ]);

    res.status(201).json({ review: result.rows[0], avgRating });
  } catch (err) {
    next(err);
  }
};

// Helper to calculate "time ago"
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + " year(s) ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + " month(s) ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + " day(s) ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + " hour(s) ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + " minute(s) ago";
  return "Just now";
}

// Get all reviews for a freelancer
const getReviewsByFreelancer = async (req, res, next) => {
  try {
    const { freelancerId } = req.params;

    const result = await pool.query(
      `SELECT r.id, r.rating, r.review_text, r.created_at,
              r.project_id,
              p.title AS project_title,
              u.first_name AS client_first_name,
              u.last_name AS client_last_name
       FROM freelancer_reviews r
       LEFT JOIN projects p ON r.project_id = p.id
       JOIN users u ON r.client_id = u.id
       WHERE r.freelancer_id=$1
       ORDER BY r.created_at DESC`,
      [freelancerId]
    );

    // Map reviews to include "timeAgo"
    const reviewsWithTime = result.rows.map((r) => ({
      ...r,
      timeAgo: timeAgo(r.created_at),
    }));

    res.json({ reviews: reviewsWithTime });
  } catch (err) {
    next(err);
  }
};

module.exports = { addReview, getReviewsByFreelancer };
