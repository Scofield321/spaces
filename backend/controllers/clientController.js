const pool = require("../config/db");

// ---------- Search Freelancers ----------
const searchFreelancers = async (req, res, next) => {
  try {
    const { query = "" } = req.query;

    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_picture,
        u.verified,
        fp2.title AS freelancer_title,
        COALESCE(array_agg(DISTINCT s.skill_name) FILTER (WHERE s.skill_name IS NOT NULL), '{}') AS skills,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'title', fp.title,
              'link', fp.link
            )
          ) FILTER (WHERE fp.id IS NOT NULL),
          '[]'
        ) AS projects,
        COALESCE(AVG(r.rating), 0) AS rating,
    
        EXISTS (
          SELECT 1
          FROM contracts c
          JOIN projects p ON c.project_id = p.id
          WHERE c.freelancer_id = u.id
            AND p.client_id = $2
            AND c.status = 'completed'
        ) AS "clientHasHired"
    
      FROM users u
      LEFT JOIN skills s ON s.freelancer_id = u.id
      LEFT JOIN freelancer_projects fp ON fp.freelancer_id = u.id
      LEFT JOIN freelancer_reviews r ON r.freelancer_id = u.id
      LEFT JOIN freelancer_profiles fp2 ON fp2.user_id = u.id
    
      WHERE u.role='freelancer'
        AND (
          u.first_name ILIKE $1 
          OR u.last_name ILIKE $1
          OR s.skill_name ILIKE $1
          OR fp.title ILIKE $1
          OR fp2.title ILIKE $1 -- ✅ allow searching by freelancer headline/title
        )
      GROUP BY u.id, fp2.title
      ORDER BY rating DESC
      `,
      [`%${query}%`, req.user.id]
    );

    res.json({ freelancers: result.rows });
  } catch (err) {
    next(err);
  }
};

// ---------- GET APPLICATIONS FOR CLIENT PROJECTS ----------
const getClientApplications = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
          a.id AS application_id, 
          a.created_at, 
          a.status,

          u.id AS freelancer_id, 
          u.first_name, 
          u.last_name, 
          u.profile_picture,
          u.verified, 

          p.id AS project_id, 
          p.title AS project_title
       FROM applications a
       JOIN projects p ON a.project_id = p.id
       JOIN users u ON a.freelancer_id = u.id
       WHERE p.client_id = $1
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    res.json({ applications: result.rows });
  } catch (err) {
    next(err);
  }
};

// ---------- Post Project / Hire Freelancer ----------
const postProject = async (req, res, next) => {
  try {
    const { freelancerId, title, description, budget, budget_text, category } =
      req.body;

    const rawBudgetText = budget_text?.toString() || budget?.toString() || "";

    // Extract numeric part (first number found)
    const numeric = rawBudgetText.match(/[\d,.]+/g);
    const budgetAmount = numeric
      ? parseFloat(numeric[0].replace(/,/g, ""))
      : null;

    if (!budgetAmount) {
      return res.status(400).json({ error: "Invalid budget amount" });
    }

    const result = await pool.query(
      `INSERT INTO projects (client_id, title, description, budget, budget_text, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.id,
        title,
        description || "",
        budgetAmount,
        rawBudgetText,
        category,
      ]
    );

    res.status(201).json({ project: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ---------- Get Projects Posted by Client ----------
const getMyProjects = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
         p.id,
         p.title,
         p.description,
         p.budget,
         p.budget_text,
         p.category,
         p.status,
         p.created_at,
         p.updated_at,
         f.id AS freelancer_id,
         f.first_name AS freelancer_first_name,
         f.last_name AS freelancer_last_name
       FROM projects p
       LEFT JOIN users f ON p.freelancer_id = f.id
       WHERE p.client_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    res.json({ projects: result.rows });
  } catch (err) {
    next(err);
  }
};

// ---------- Edit Project ----------
const editProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, budget, budget_text, category } = req.body;

    const rawBudgetText = budget_text?.toString() || budget?.toString() || "";

    const numeric = rawBudgetText.match(/[\d,.]+/g);
    const budgetAmount = numeric
      ? parseFloat(numeric[0].replace(/,/g, ""))
      : null;

    if (!budgetAmount) {
      return res.status(400).json({ error: "Invalid budget amount" });
    }

    const result = await pool.query(
      `UPDATE projects
       SET title = $1,
           description = $2,
           budget = $3,
           budget_text = $4,
           category = $5,
           updated_at = NOW()
       WHERE id = $6 AND client_id = $7
       RETURNING *`,
      [
        title,
        description,
        budgetAmount,
        rawBudgetText,
        category,
        projectId,
        req.user.id,
      ]
    );

    res.json({ message: "Project updated", project: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ---------- Delete Project ----------
const deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const result = await pool.query(
      `DELETE FROM projects
       WHERE id=$1 AND client_id=$2
       RETURNING *`,
      [projectId, req.user.id]
    );

    if (!result.rows.length)
      return res.status(404).json({ msg: "Project not found or unauthorized" });

    res.json({ msg: "Project deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ---------- Get Client Contracts ----------
const getContracts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.id AS contract_id, c.amount, c.status, p.title AS project_title,
              u.first_name AS freelancer_first_name, u.last_name AS freelancer_last_name
       FROM contracts c
       JOIN projects p ON c.project_id = p.id
       JOIN users u ON c.freelancer_id = u.id
       WHERE p.client_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    const contracts = result.rows.map((c) => ({
      ...c,
      freelancer_name: `${c.freelancer_first_name} ${c.freelancer_last_name}`,
    }));

    res.json({ contracts });
  } catch (err) {
    next(err);
  }
};

// ---------- Get Client Payments ----------
const getPayments = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT pay.id, pay.amount, pay.status, pay.payment_date, p.title AS project_title,
              u.first_name AS freelancer_first_name, u.last_name AS freelancer_last_name
       FROM payments pay
       JOIN contracts c ON pay.contract_id = c.id
       JOIN projects p ON c.project_id = p.id
       JOIN users u ON c.freelancer_id = u.id
       WHERE p.client_id = $1
       ORDER BY pay.payment_date DESC`,
      [req.user.id]
    );

    const payments = result.rows.map((p) => ({
      ...p,
      freelancer_name: `${p.freelancer_first_name} ${p.freelancer_last_name}`,
    }));

    res.json({ payments });
  } catch (err) {
    next(err);
  }
};

// ---------- Assign Freelancer to Project ----------
const hireFreelancer = async (req, res, next) => {
  const clientId = req.user.id;
  const { freelancerId, projectTitle, projectDescription, budget, budgetText } =
    req.body;

  if (!freelancerId || !projectTitle || budget === undefined) {
    return res
      .status(400)
      .json({
        message: "Freelancer ID, project title and budget are required",
      });
  }

  try {
    await pool.query("BEGIN");

    // 1️⃣ Create project with freelancer assigned
    const projectRes = await pool.query(
      `INSERT INTO projects (client_id, freelancer_id, title, description, budget, budget_text, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'assigned')
       RETURNING *`,
      [
        clientId,
        freelancerId,
        projectTitle,
        projectDescription || "",
        budget,
        budgetText || `$${budget}`,
      ]
    );
    const project = projectRes.rows[0];

    // 2️⃣ Create contract
    const contractRes = await pool.query(
      `INSERT INTO contracts (project_id, freelancer_id, amount, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [project.id, freelancerId, budget || 0]
    );
    const contract = contractRes.rows[0];

    // 3️⃣ Send notifications to freelancer
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, extra_data)
       VALUES ($1, 'assigned_project', $2, $3)`,
      [
        freelancerId,
        `You have been assigned a project: ${project.title}`,
        JSON.stringify({
          project_id: project.id,
          project_title: project.title,
        }),
      ]
    );

    // 4️⃣ Send notification to client
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, extra_data)
       VALUES ($1, 'freelancer_accepted_project', $2, $3)`,
      [
        clientId,
        `You assigned "${project.title}" to a freelancer successfully`,
        JSON.stringify({ freelancer_id: freelancerId, project_id: project.id }),
      ]
    );

    await pool.query("COMMIT");

    res
      .status(201)
      .json({ message: "Freelancer hired successfully", project, contract });
  } catch (err) {
    await pool.query("ROLLBACK");
    next(err);
  }
};

// ---------- Invite Freelancer ----------
const inviteFreelancer = async (req, res, next) => {
  const clientId = req.user.id;
  const { freelancerId, projectTitle, projectDescription, message } = req.body;

  if (!freelancerId || !projectTitle) {
    return res.status(400).json({
      message: "Freelancer ID and project title are required",
    });
  }

  try {
    // 0️⃣ Check if client is verified
    const clientRes = await pool.query(
      `SELECT verified, first_name, last_name FROM users WHERE id = $1`,
      [clientId]
    );
    const client = clientRes.rows[0];
    if (!client.verified) {
      return res.status(403).json({
        message: "You must be a verified client to invite freelancers",
      });
    }

    await pool.query("BEGIN");

    // 1️⃣ Create temporary project assigned to the specific freelancer
    const projectRes = await pool.query(
      `INSERT INTO projects (client_id, freelancer_id, title, description, status)
       VALUES ($1, $2, $3, $4, 'invitation')
       RETURNING *`,
      [clientId, freelancerId, projectTitle, projectDescription || ""]
    );
    const project = projectRes.rows[0];

    // 2️⃣ Create contract with message
    const contractRes = await pool.query(
      `INSERT INTO contracts (project_id, freelancer_id, amount, status, message)
       VALUES ($1, $2, $3, 'sent', $4)
       RETURNING *`,
      [project.id, freelancerId, 0, message || null]
    );
    const contract = contractRes.rows[0];

    // 3️⃣ Send notification to freelancer
    const notifRes = await pool.query(
      `INSERT INTO notifications (user_id, type, message, extra_data)
       VALUES ($1, 'invited_to_project', $2, $3)
       RETURNING *`,
      [
        freelancerId,
        message || `You have been invited to a project: ${projectTitle}`,
        JSON.stringify({
          project_id: project.id,
          project_title: project.title,
          project_description: project.description,
          client_name: client.first_name + " " + client.last_name,
          contract_id: contract.id,
        }),
      ]
    );

    await pool.query("COMMIT");

    res.status(201).json({
      message: "Freelancer invited successfully",
      client_verified: client.verified,
      contract,
      notification: notifRes.rows[0],
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    next(err);
  }
};

// -------- Getting the Invitations --------------
const getClientInvites = async (req, res, next) => {
  const clientId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT 
        c.id AS contract_id,
        c.status,
        c.message,
        c.decline_reason, 
        p.id AS project_id,
        p.title AS project_title,
        p.description AS project_description,
        u.first_name || ' ' || u.last_name AS freelancer_name,
        u.email AS freelancer_email
      FROM contracts c
      JOIN projects p ON c.project_id = p.id
      JOIN users u ON c.freelancer_id = u.id
      WHERE p.client_id = $1 
        AND p.status = 'invitation'
      ORDER BY c.created_at DESC`,
      [clientId]
    );

    res.json({ success: true, invites: result.rows });
  } catch (err) {
    next(err);
  }
};

// ---------- Get Single Project by ID ----------
const getSingleProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const result = await pool.query(
      `SELECT id, title, description, budget, budget_text, category, created_at, updated_at
       FROM projects
       WHERE id=$1 AND client_id=$2`,
      [projectId, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ msg: "Project not found" });
    }

    res.json({ project: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ---------- Update Invitation ----------
const updateInvitation = async (req, res, next) => {
  const clientId = req.user.id;
  const { contractId } = req.params;
  const { projectTitle, projectDescription, message } = req.body;

  try {
    // Update the contract and the related temporary project
    const result = await pool.query(
      `WITH updated_contract AS (
        UPDATE contracts c
        SET message = COALESCE($3, c.message)
        WHERE c.id = $1
        RETURNING c.*
      )
      UPDATE projects p
      SET title = COALESCE($2, p.title),
          description = COALESCE($4, p.description)
      FROM updated_contract uc
      WHERE p.id = uc.project_id AND p.client_id = $5
      RETURNING uc.*`,
      [contractId, projectTitle, message, projectDescription, clientId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Invitation not found or not owned by you" });
    }

    res.json({
      success: true,
      message: "Invitation updated successfully",
      contract: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ---------- Delete Invitation ----------
const deleteInvitation = async (req, res, next) => {
  const clientId = req.user.id;
  const { contractId } = req.params;

  try {
    // Delete the contract and the temporary project if it exists
    const result = await pool.query(
      `DELETE FROM contracts c
       USING projects p
       WHERE c.id = $1
         AND c.project_id = p.id
         AND p.client_id = $2
       RETURNING c.*`,
      [contractId, clientId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Invitation not found or not owned by you" });
    }

    res.json({
      success: true,
      message: "Invitation deleted successfully",
      contract: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

const getNotifications = async (req, res) => {
  const notifications = await pool.query(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [req.user.id]
  );

  res.json({ notifications: notifications.rows });
};

// clientController.js (or a new notificationsController.js)
const createNotification = async (req, res) => {
  try {
    const { userId, type, message, extra_data } = req.body;

    if (!userId || !type || !message) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, message, extra_data)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, type, message, extra_data || null]
    );

    res.status(201).json({ success: true, notification: result.rows[0] });
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(500).json({ msg: "Failed to create notification" });
  }
};

// -----------Marking notifcations as Read ----------

const markRead = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ msg: "Notification not found or unauthorized" });
    }

    res.json({ success: true, notification: result.rows[0] });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

module.exports = {
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
  getNotifications,
  updateInvitation,
  deleteInvitation,
  markRead,
  getClientInvites,
  createNotification,
};
