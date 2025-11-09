const supabase = require("../config/superbase");
const pool = require("../config/db");

// ==== RAISING THE DISPUTE ======
const raiseDispute = async (req, res) => {
  try {
    const { project_title, reason, description, against } = req.body;
    const raised_by = req.user.id;
    const files = req.files;

    if (!project_title || !reason || !against) {
      return res
        .status(400)
        .json({ message: "Project title, against and reason are required" });
    }

    // For MVP, we skip validating against an actual project
    // Optionally, set 'against' to null or leave it empty

    // 1️⃣ Create dispute
    const dispute = await pool.query(
      `INSERT INTO disputes (project_title, raised_by, against, reason, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [project_title, raised_by, against, reason, description]
    );

    const dispute_id = dispute.rows[0].id;
    const urls = [];

    // 2️⃣ Upload evidence (if files exist)
    if (files && files.length) {
      for (const file of files) {
        const fileName = `dispute/${dispute_id}/${Date.now()}-${
          file.originalname
        }`;

        const { error } = await supabase.storage
          .from("dispute_evidence")
          .upload(fileName, file.buffer, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.mimetype,
          });

        if (error) throw error;

        const { data } = supabase.storage
          .from("dispute_evidence")
          .getPublicUrl(fileName);

        if (data?.publicURL) {
          urls.push(data.publicURL);
          await pool.query(
            "INSERT INTO dispute_evidence (dispute_id, file_url, uploaded_by) VALUES ($1, $2, $3)",
            [dispute_id, data.publicURL, raised_by]
          );
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: "Dispute raised successfully",
      dispute: dispute.rows[0],
      evidence: urls,
    });
  } catch (err) {
    console.error("Error creating dispute:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== GETTING ALL THE DISPUTES =======
const getDisputes = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let query;
    let params = [];

    if (role === "admin") {
      query = `
        SELECT d.*,
               d.project_title,
               d.admin_reason,  -- add this
               rb.first_name AS raised_by_first_name,
               rb.last_name AS raised_by_last_name,
               rb.role AS raised_by_role,
               rb.email AS raised_by_email,
               ag.first_name AS against_first_name,
               ag.last_name AS against_last_name,
               ag.role AS against_role,
               ag.email AS against_email,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'file_url', e.file_url,
                     'uploaded_by', e.uploaded_by,
                     'uploaded_at', e.created_at
                   )
                 ) FILTER (WHERE e.id IS NOT NULL), '[]'
               ) AS evidence
        FROM disputes d
        LEFT JOIN users rb ON d.raised_by = rb.id
        LEFT JOIN users ag ON d.against = ag.id
        LEFT JOIN dispute_evidence e ON d.id = e.dispute_id
        GROUP BY d.id, rb.first_name, rb.last_name, rb.role, rb.email,
                 ag.first_name, ag.last_name, ag.role, ag.email
        ORDER BY d.created_at DESC;
      `;
    } else {
      query = `
        SELECT d.*,
               d.project_title,
               d.admin_reason,  -- add this
               rb.first_name AS raised_by_first_name,
               rb.last_name AS raised_by_last_name,
               rb.role AS raised_by_role,
               rb.email AS raised_by_email,
               ag.first_name AS against_first_name,
               ag.last_name AS against_last_name,
               ag.role AS against_role,
               ag.email AS against_email,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'file_url', e.file_url,
                     'uploaded_by', e.uploaded_by,
                     'uploaded_at', e.created_at
                   )
                 ) FILTER (WHERE e.id IS NOT NULL), '[]'
               ) AS evidence
        FROM disputes d
        LEFT JOIN users rb ON d.raised_by = rb.id
        LEFT JOIN users ag ON d.against = ag.id
        LEFT JOIN dispute_evidence e ON d.id = e.dispute_id
        WHERE d.raised_by = $1 OR d.against = $1
        GROUP BY d.id, rb.first_name, rb.last_name, rb.role, rb.email,
                 ag.first_name, ag.last_name, ag.role, ag.email
        ORDER BY d.created_at DESC;
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rowCount,
      disputes: result.rows,
    });
  } catch (err) {
    console.error("Error fetching disputes:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch disputes. Please try again later.",
    });
  }
};

// ======RESOLVING A CERTAIN DISPUTE ======
const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, admin_reason } = req.body;

    // Validate status
    const validStatuses = [
      "under_review",
      "in_progress",
      "resolved",
      "rejected",
    ];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    // Update the dispute
    const result = await pool.query(
      `UPDATE disputes
       SET status = $1,
           resolution = $2,
           admin_reason = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, resolution || null, admin_reason || null, id]
    );

    if (!result.rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Dispute not found" });
    }

    res.json({
      success: true,
      dispute: result.rows[0],
    });
  } catch (err) {
    console.error("Error resolving dispute:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =====FETCHING THE EVIDENCE =============
const getEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const evidence = await pool.query(
      "SELECT * FROM dispute_evidence WHERE dispute_id=$1 ORDER BY created_at ASC",
      [id]
    );
    res.json({ success: true, evidence: evidence.rows });
  } catch (err) {
    console.error("Error fetching evidence:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//====== GETTING THE PERSON IN DISPUTE =======
const getUsersForDispute = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let query,
      params = [];

    if (role === "client") {
      // Get freelancers this client has worked with
      query = `
        SELECT u.id, u.first_name, u.last_name, u.role
        FROM users u
        JOIN projects p ON (p.client_id = $1 AND p.freelancer_id = u.id)
        GROUP BY u.id
      `;
      params = [userId];
    } else if (role === "freelancer") {
      // Get clients this freelancer has worked with
      query = `
        SELECT u.id, u.first_name, u.last_name, u.role
        FROM users u
        JOIN projects p ON (p.freelancer_id = $1 AND p.client_id = u.id)
        GROUP BY u.id
      `;
      params = [userId];
    } else {
      // Admin can see all users
      query = `SELECT id, first_name, last_name, role FROM users`;
    }

    const result = await pool.query(query, params);
    res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error("Error fetching users for dispute:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Resolving and updating dispute status

const updateDisputeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;

    // ✅ 1. Define all valid statuses
    const validStatuses = [
      "under_review",
      "in_progress",
      "resolved",
      "rejected",
    ];

    // ✅ 2. Validate the provided status
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(", ")}`,
      });
    }

    // ✅ 3. Update dispute in DB
    const result = await pool.query(
      `UPDATE disputes
       SET status = $1,
           resolution = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, resolution || null, id]
    );

    // ✅ 4. Handle not found case
    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Dispute not found",
      });
    }

    // ✅ 5. Respond success
    const updatedDispute = result.rows[0];
    res.json({
      success: true,
      message: `Dispute status updated to '${status}' successfully.`,
      dispute: updatedDispute,
    });
  } catch (err) {
    console.error("Error updating dispute status:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating dispute status",
    });
  }
};

module.exports = {
  raiseDispute,
  getDisputes,
  resolveDispute,
  getEvidence,
  getUsersForDispute,
  updateDisputeStatus,
};
