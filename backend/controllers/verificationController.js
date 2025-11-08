// controllers/verificationController.js
const pool = require("../config/db");
require("dotenv").config();
const supabase = require("../config/superbase");

// -------------------------
// Upload to Supabase
// -------------------------
const uploadToSupabase = async (file, userId) => {
  const fileName = `${userId}/${Date.now()}-${file.originalname}`;

  const { error } = await supabase.storage
    .from("user-verifications")
    .upload(fileName, file.buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.mimetype,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("user-verifications")
    .getPublicUrl(fileName);

  // Return the public URL
  return data.publicURL;
};

// -------------------------
// Submit Verification Docs
// -------------------------
const submitVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.body.user_role; // freelancer or client
    const { client_type, document_type } = req.body;

    const frontFile = req.files?.front?.[0];
    const backFile = req.files?.back?.[0];

    if (!frontFile) return res.status(400).json({ msg: "Front doc required" });

    const frontUrl = await uploadToSupabase(frontFile, userId);
    const backUrl = backFile ? await uploadToSupabase(backFile, userId) : null;

    const sql = `
      INSERT INTO user_verifications
      (user_id, user_role, client_type, document_type, document_front, document_back)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`;

    const { rows } = await pool.query(sql, [
      userId,
      userRole,
      client_type || null,
      document_type,
      frontUrl,
      backUrl,
    ]);

    res.json({ success: true, verification: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
};

// -------------------------
// Get User Verification
// -------------------------
// controllers/verificationController.js

const getUserVerification = async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        id,
        user_role,
        client_type,
        document_type,
        document_front,
        document_back,
        status,
        rejection_reason,
        reviewed_at,
        submitted_at
      FROM user_verifications
      WHERE user_id = $1
      ORDER BY submitted_at DESC
      LIMIT 1
    `;

    const { rows } = await pool.query(sql, [userId]);

    if (!rows[0]) {
      return res.status(404).json({ msg: "No verification submitted yet" });
    }

    res.json({ success: true, verification: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error fetching verification" });
  }
};

// -------------------------
// List pending verifications (for admin dashboard)
// -------------------------
const listPendingVerifications = async (req, res) => {
  try {
    const query = `
      SELECT 
        uv.id,
        uv.user_id,
        uv.user_role,
        uv.client_type,
        uv.document_type,
        uv.document_front,
        uv.document_back,
        uv.status,
        uv.submitted_at,
        u.first_name,
        u.last_name,
        u.email
      FROM user_verifications uv
      JOIN users u ON u.id = uv.user_id
      WHERE uv.status = 'pending'
      ORDER BY uv.submitted_at DESC;
    `;

    const result = await pool.query(query);

    return res.json({ verifications: result.rows });
  } catch (err) {
    console.error("Error fetching pending verifications:", err);
    return res.status(500).json({ msg: "Server error fetching verifications" });
  }
};

// -------------------------
// Approve verification
// -------------------------
const approveVerification = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;

  try {
    await pool.query(
      `UPDATE user_verifications
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2`,
      [adminId, id]
    );

    return res.json({ msg: "Verification approved" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Server error approving verification" });
  }
};

// -------------------------
// Reject verification
// -------------------------
const rejectVerification = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;
  const { reason } = req.body;

  try {
    await pool.query(
      `UPDATE user_verifications
       SET status = 'rejected', rejection_reason = $2, reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $3`,
      [adminId, reason, id]
    );

    return res.json({ msg: "Verification rejected" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Server error rejecting verification" });
  }
};

// Get all verifications (admin)
const getAllVerifications = async (req, res) => {
  try {
    const sql = `
      SELECT uv.id, uv.user_id, uv.user_role, uv.client_type, uv.document_type,
             uv.document_front, uv.document_back, uv.status, uv.rejection_reason,
             uv.submitted_at, uv.reviewed_at, u.first_name, u.last_name
      FROM user_verifications uv
      JOIN users u ON uv.user_id = u.id
      ORDER BY uv.submitted_at DESC
    `;
    const { rows } = await pool.query(sql);
    res.json({ verifications: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error fetching verifications" });
  }
};

module.exports = {
  submitVerification,
  getUserVerification,
  listPendingVerifications,
  approveVerification,
  rejectVerification,
  getAllVerifications,
};
