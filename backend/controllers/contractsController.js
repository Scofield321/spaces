const pool = require("../config/db");

// ------------------ CREATE CONTRACT ------------------
const createContract = async (req, res, next) => {
  const clientId = req.user.id;
  const {
    freelancerId,
    projectTitle,
    projectDescription = "",
    type = "fixed",
    amount,
    hourly_rate,
    start_date,
    end_date,
    expected_duration,
    work_scope,
    milestones = [],
    attachments = [],
    payment_terms = [],
    send_to_freelancer = false,
  } = req.body;

  if (
    !freelancerId ||
    !projectTitle ||
    (type === "fixed" && !amount) ||
    (type === "hourly" && !hourly_rate)
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    await pool.query("BEGIN");

    // 1️⃣ Find or create project
    let projectRes = await pool.query(
      `SELECT * FROM projects WHERE title = $1 AND client_id = $2`,
      [projectTitle, clientId]
    );

    let project;
    if (projectRes.rows.length) {
      project = projectRes.rows[0];
    } else {
      const insertProjectRes = await pool.query(
        `INSERT INTO projects (title, description, client_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [projectTitle, projectDescription, clientId]
      );
      project = insertProjectRes.rows[0];
    }

    // 1.1️⃣ Assign freelancer and mark project as assigned
    await pool.query(
      `UPDATE projects
       SET freelancer_id = $1,
           status = 'assigned',
           updated_at = NOW()
       WHERE id = $2`,
      [freelancerId, project.id]
    );

    // 2️⃣ Insert contract
    const contractRes = await pool.query(
      `INSERT INTO contracts
        (project_id, freelancer_id, client_id, type, amount, hourly_rate, start_date, end_date,
         expected_duration, work_scope, milestones, attachments, payment_terms, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        project.id,
        freelancerId,
        clientId,
        type,
        amount || null,
        hourly_rate || null,
        start_date || null,
        end_date || null,
        expected_duration || null,
        work_scope || null,
        JSON.stringify(milestones) || null,
        JSON.stringify(attachments) || null,
        JSON.stringify(payment_terms) || null,
        send_to_freelancer ? "sent" : "draft",
      ]
    );

    const contract = contractRes.rows[0];

    // 3️⃣ Notify freelancer if send_to_freelancer
    let notif = null;
    if (send_to_freelancer) {
      const freelancerNotif = await pool.query(
        `INSERT INTO notifications (user_id, type, message, extra_data)
         VALUES ($1, 'contract_sent', $2, $3)
         RETURNING *`,
        [
          freelancerId,
          `You have a new contract for project "${project.title}"`,
          JSON.stringify({ contract_id: contract.id, projectId: project.id }),
        ]
      );
      notif = freelancerNotif.rows[0];
    }

    await pool.query("COMMIT");
    res.status(201).json({ contract, notification: notif });
  } catch (err) {
    await pool.query("ROLLBACK");
    next(err);
  }
};

// ------------------ FREELANCER ACCEPT CONTRACT ------------------
const acceptContract = async (req, res, next) => {
  const freelancerId = req.user.id;
  const { contractId } = req.params;

  try {
    const contractRes = await pool.query(
      `UPDATE contracts
       SET status = 'accepted', updated_at = NOW()
       WHERE id=$1 AND freelancer_id=$2 AND status='sent'
       RETURNING *`,
      [contractId, freelancerId]
    );

    if (!contractRes.rows.length) {
      return res
        .status(404)
        .json({ message: "Contract not found or not in 'sent' status" });
    }

    const contract = contractRes.rows[0];

    // Optional: assign freelancer to project
    await pool.query(
      `UPDATE projects SET freelancer_id=$1, status='assigned', updated_at=NOW()
       WHERE id=$2`,
      [freelancerId, contract.project_id]
    );

    res.json({ message: "Contract accepted", contract });
  } catch (err) {
    next(err);
  }
};

// ------------------ FREELANCER DECLINE CONTRACT ------------------
const declineContract = async (req, res, next) => {
  const freelancerId = req.user.id;
  const { contractId } = req.params;

  try {
    const contractRes = await pool.query(
      `UPDATE contracts
       SET status = 'closed', updated_at = NOW()
       WHERE id=$1 AND freelancer_id=$2 AND status='sent'
       RETURNING *`,
      [contractId, freelancerId]
    );

    if (!contractRes.rows.length) {
      return res
        .status(404)
        .json({ message: "Contract not found or not in 'sent' status" });
    }

    res.json({ message: "Contract declined", contract: contractRes.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ------------------ FUND ESCROW ------------------
const fundEscrow = async (req, res, next) => {
  const clientId = req.user.id;
  const { contractId } = req.params;

  try {
    const contractRes = await pool.query(
      `UPDATE contracts
       SET escrow_funded = TRUE, updated_at = NOW()
       WHERE id=$1 AND client_id=$2
       RETURNING *`,
      [contractId, clientId]
    );

    if (!contractRes.rows.length) {
      return res
        .status(404)
        .json({ message: "Contract not found or unauthorized" });
    }

    res.json({ message: "Escrow funded", contract: contractRes.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ------------------ GET CONTRACTS (CLIENT OR FREELANCER) ------------------
const getContracts = async (req, res, next) => {
  const userId = req.user.id;
  const role = req.user.role;

  // Helper to safely parse JSON
  function safeParse(json) {
    try {
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }

  try {
    let result;

    if (role === "client") {
      // Client sees all contracts for their projects, with freelancer info
      result = await pool.query(
        `SELECT c.*, 
                p.title AS project_title,
                p.description AS project_description,
                u.first_name AS freelancer_first_name,
                u.last_name AS freelancer_last_name,
                u.email AS freelancer_email
         FROM contracts c
         JOIN projects p ON c.project_id = p.id
         JOIN users u ON c.freelancer_id = u.id
         WHERE c.client_id = $1
         ORDER BY c.created_at DESC`,
        [userId]
      );

      const contracts = result.rows.map((c) => ({
        ...c,
        freelancer_name: `${c.freelancer_first_name} ${c.freelancer_last_name}`,
        freelancer_email: c.freelancer_email,
        milestones: safeParse(c.milestones),
        attachments: safeParse(c.attachments),
        payment_terms: safeParse(c.payment_terms),
        project_description: c.project_description || "",
      }));

      res.json({ contracts });
    } else {
      // Freelancer sees all their contracts, with project and client info
      result = await pool.query(
        `SELECT c.*, 
                p.title AS project_title,
                p.description AS project_description,
                u.first_name AS client_first_name,
                u.last_name AS client_last_name,
                u.email AS client_email
         FROM contracts c
         JOIN projects p ON c.project_id = p.id
         JOIN users u ON c.client_id = u.id
         WHERE c.freelancer_id = $1
         ORDER BY c.created_at DESC`,
        [userId]
      );

      const contracts = result.rows.map((c) => ({
        ...c,
        client_name: `${c.client_first_name} ${c.client_last_name}`,
        client_email: c.client_email,
        milestones: safeParse(c.milestones),
        attachments: safeParse(c.attachments),
        payment_terms: safeParse(c.payment_terms),
        project_description: c.project_description || "",
      }));

      res.json({ contracts });
    }
  } catch (err) {
    next(err);
  }
};

// ------------------GET A CONTRACT BY ID ------------------
const getContractById = async (req, res) => {
  try {
    const { contractId } = req.params;

    const result = await pool.query(
      `SELECT c.*, 
              f.first_name || ' ' || f.last_name AS freelancer_name,
              f.email AS freelancer_email,
              cl.first_name || ' ' || cl.last_name AS client_name,
              cl.email AS client_email
       FROM contracts c
       LEFT JOIN users f ON f.id = c.freelancer_id
       LEFT JOIN users cl ON cl.id = c.client_id
       WHERE c.id = $1`,
      [contractId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Contract not found" });
    }

    res.json({ success: true, contract: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createContract,
  acceptContract,
  declineContract,
  fundEscrow,
  getContracts,
  getContractById,
};
