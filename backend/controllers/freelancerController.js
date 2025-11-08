const pool = require("../config/db");

// ---------- GET AVAILABLE JOBS ----------
const getAvailableJobs = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.title, p.description, p.budget, p.budget_text, p.status, p.created_at,
              u.first_name AS client_first_name,
              u.last_name AS client_last_name,
              COUNT(a.id) AS applicants,
              EXISTS (
                SELECT 1 FROM applications ap
                WHERE ap.project_id = p.id AND ap.freelancer_id = $1
              ) AS already_applied
       FROM projects p
       JOIN users u ON p.client_id = u.id
       LEFT JOIN applications a ON a.project_id = p.id
       WHERE p.status = 'open'
         AND p.freelancer_id IS NULL
         AND p.status != 'invitation'  -- exclude invitations
       GROUP BY p.id, u.first_name, u.last_name
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    const jobs = result.rows.map((j) => ({
      ...j,
      already_applied: j.already_applied,
      client_name: `${j.client_first_name} ${j.client_last_name}`.trim(),
    }));

    res.json({ jobs });
  } catch (err) {
    next(err);
  }
};

// --------Recent Applications ------------

const getFreelancerApplications = async (req, res, next) => {
  try {
    const freelancerId = req.user.id;

    const result = await pool.query(
      `SELECT 
         a.id AS application_id,
         a.status,
         a.created_at AS applied_on,
         p.id AS project_id,
         p.title AS project_title,
         p.status AS project_status,
         u.id AS client_id,
         u.first_name AS client_first_name,
         u.last_name AS client_last_name
       FROM applications a
       JOIN projects p ON a.project_id = p.id
       JOIN users u ON p.client_id = u.id
       WHERE a.freelancer_id = $1
       ORDER BY a.created_at DESC
       LIMIT 10`,
      [freelancerId]
    );

    res.json({ applications: result.rows });
  } catch (err) {
    next(err);
  }
};

// ---------- APPLY TO JOB ----------
const applyJob = async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const freelancerId = req.user.id;

    // 1️⃣ Prevent duplicate applications
    const exists = await pool.query(
      `SELECT * FROM applications WHERE freelancer_id = $1 AND project_id = $2`,
      [freelancerId, projectId]
    );
    if (exists.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Already applied to this project" });
    }

    // 2️⃣ Insert application
    const result = await pool.query(
      `INSERT INTO applications (freelancer_id, project_id) 
       VALUES ($1, $2) RETURNING *`,
      [freelancerId, projectId]
    );
    const application = result.rows[0];

    // 3️⃣ Lookup client from project
    const projectRes = await pool.query(
      `SELECT client_id, title FROM projects WHERE id = $1`,
      [projectId]
    );
    const project = projectRes.rows[0];
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // 4️⃣ Create notification
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, extra_data)
       VALUES ($1, $2, $3, $4)`,
      [
        project.client_id,
        "freelancer_applied",
        `A freelancer has applied to your project: ${project.title}`,
        JSON.stringify({
          freelancer_id: freelancerId,
          project_id: projectId,
        }),
      ]
    );

    res.status(201).json({
      message: "Application submitted successfully",
      application,
    });
  } catch (err) {
    console.error("Error applying for job:", err);
    next(err);
  }
};

// ---------- GET FREELANCER'S PROJECTS ----------
const getMyProjects = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
              p.title AS project_title, 
              p.description AS project_description,
              p.budget, 
              p.budget_text, 
              u.first_name AS client_first_name,
              u.last_name AS client_last_name
       FROM contracts c
       JOIN projects p ON c.project_id = p.id
       JOIN users u ON p.client_id = u.id
       WHERE c.freelancer_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    const contracts = result.rows.map((c) => ({
      ...c,
      client_name: `${c.client_first_name} ${c.client_last_name}`.trim(),
    }));

    res.json({ contracts });
  } catch (err) {
    next(err);
  }
};

// ---------- GET ASSIGNED PROJECTS ----------
const getAssignedProjects = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.title, p.description, p.budget, p.budget_text, p.status,
              u.first_name AS client_first_name,
              u.last_name AS client_last_name,
              u.verified AS client_verified
       FROM projects p
       JOIN users u ON p.client_id = u.id
       WHERE p.freelancer_id = $1
         AND p.status IN ('assigned', 'invitation')  -- include invited projects
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    const projects = result.rows.map((p) => ({
      ...p,
      client_name: `${p.client_first_name} ${p.client_last_name}`.trim(),
    }));

    res.json({ projects });
  } catch (err) {
    next(err);
  }
};

// ---------- GET FREELANCER'S PAYMENTS ----------
const getPayments = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT pay.*, c.status AS contract_status, p.title AS project_title
       FROM payments pay
       JOIN contracts c ON pay.contract_id = c.id
       JOIN projects p ON c.project_id = p.id
       WHERE c.freelancer_id = $1
       ORDER BY pay.payment_date DESC`,
      [req.user.id]
    );
    res.json({ payments: result.rows });
  } catch (err) {
    next(err);
  }
};

// ---------- ACCEPT ASSIGNED PROJECT ----------
const acceptProject = async (req, res, next) => {
  try {
    const { projectId } = req.body;

    // Mark project as accepted
    const result = await pool.query(
      `UPDATE projects 
       SET status = 'accepted'
       WHERE id = $1 AND freelancer_id = $2
       RETURNING client_id, title`,
      [projectId, req.user.id]
    );

    const project = result.rows[0];

    // Get freelancer info
    const freelancerRes = await pool.query(
      `SELECT first_name, last_name, email FROM users WHERE id = $1`,
      [req.user.id]
    );
    const freelancer = freelancerRes.rows[0];

    // Save notification for client with extra_data
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, extra_data)
       VALUES ($1, 'freelancer_accepted_project', $2, $3)`,
      [
        project.client_id,
        `Your project "${project.title}" was accepted by ${freelancer.first_name} ${freelancer.last_name}`,
        JSON.stringify({
          freelancer_email: freelancer.email,
          freelancer_name: `${freelancer.first_name} ${freelancer.last_name}`,
          project_id: projectId,
          project_title: project.title,
        }),
      ]
    );

    res.json({ message: "Project accepted successfully" });
  } catch (err) {
    next(err);
  }
};

// ---------- DECLINE ASSIGNED PROJECT ----------
const declineProject = async (req, res, next) => {
  try {
    const { projectId, reason } = req.body;

    const result = await pool.query(
      `UPDATE projects 
       SET freelancer_id = NULL, status = 'open'
       WHERE id = $1 AND freelancer_id = $2
       RETURNING client_id, title`,
      [projectId, req.user.id]
    );

    const project = result.rows[0];

    // store decline reason
    await pool.query(
      `INSERT INTO decline_reasons (project_id, freelancer_id, reason)
       VALUES ($1, $2, $3)`,
      [projectId, req.user.id, reason]
    );

    // add notification for client
    await pool.query(
      `INSERT INTO notifications (user_id, type, message)
       VALUES ($1, 'project_declined', $2)`,
      [
        project.client_id,
        `Freelancer declined your project "${project.title}". Reason: ${reason}`,
      ]
    );

    res.json({ message: "Project declined successfully" });
  } catch (err) {
    next(err);
  }
};

// ---------- Get Freelancer Invites ----------
const getFreelancerInvites = async (req, res, next) => {
  const freelancerId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT 
        c.id AS contract_id,
        p.id AS project_id,
        p.title AS project_title,
        p.description AS project_description,
        u.first_name || ' ' || u.last_name AS client_name,
        u.email AS client_email,
        u.verified AS client_verified,
        c.status,
        c.message
      FROM contracts c
      JOIN projects p ON c.project_id = p.id
      JOIN users u ON p.client_id = u.id
      WHERE c.freelancer_id = $1 AND c.status IN ('sent', 'accepted')
      ORDER BY c.created_at DESC`,
      [freelancerId]
    );

    res.json({ success: true, invites: result.rows });
  } catch (err) {
    next(err);
  }
};

// ---------- Accept Invite ----------
const acceptInvite = async (req, res, next) => {
  const freelancerId = req.user.id;
  const { contractId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE contracts
       SET status = 'accepted'
       WHERE id = $1 AND freelancer_id = $2
       RETURNING *`,
      [contractId, freelancerId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    res.json({
      success: true,
      message: "Invitation accepted",
      contract: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ---------- Decline Invite ----------
const declineInvite = async (req, res, next) => {
  const freelancerId = req.user.id;
  const { contractId } = req.params;
  const { reason } = req.body; // new field from frontend

  if (!reason) {
    return res
      .status(400)
      .json({ message: "Reason is required to decline an invitation" });
  }

  try {
    const result = await pool.query(
      `UPDATE contracts
       SET status = 'rejected', decline_reason = $1
       WHERE id = $2 AND freelancer_id = $3
       RETURNING *`,
      [reason, contractId, freelancerId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    res.json({
      success: true,
      message: "Invitation rejected",
      contract: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

//  -----------Stats ----------------

const getFreelancerStats = async (req, res, next) => {
  try {
    const freelancerId = req.user.id;

    // Active projects: currently assigned
    const activeRes = await pool.query(
      `SELECT COUNT(*) FROM projects WHERE freelancer_id = $1 AND status = 'assigned'`,
      [freelancerId]
    );

    // Pending invites: projects where freelancer_id = NULL but the freelancer has been invited
    // We can store these as notifications with type='invite', so let's count those
    const pendingRes = await pool.query(
      `SELECT COUNT(*) FROM notifications 
       WHERE user_id = $1 AND type = 'invite' AND read = false`,
      [freelancerId]
    );

    // Completed projects
    const completedRes = await pool.query(
      `SELECT COUNT(*) FROM projects WHERE freelancer_id = $1 AND status = 'completed'`,
      [freelancerId]
    );

    res.json({
      active: parseInt(activeRes.rows[0].count),
      pending: parseInt(pendingRes.rows[0].count),
      completed: parseInt(completedRes.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
};

// ----------Get freelancer notifications ------------
const getFreelancerNotifications = async (req, res, next) => {
  try {
    const freelancerId = req.user.id;

    const result = await pool.query(
      `SELECT 
         n.id,
         n.type,
         n.message,
         n.reference_id,
         n.reference_type,
         n.read,
         n.created_at,
         n.extra_data
       FROM notifications n
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [freelancerId]
    );

    res.json({ notifications: result.rows });
  } catch (err) {
    next(err);
  }
};

// ----------Mark as Read ------------

const markNotificationRead = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const freelancerId = req.user.id;

    await pool.query(
      `UPDATE notifications
       SET read = true
       WHERE id = $1 AND user_id = $2`,
      [notificationId, freelancerId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
