const pool = require("../config/db");
const bcrypt = require("bcrypt");

// ---------------------------
// Overview
// ---------------------------
const getOverview = async (req, res, next) => {
  try {
    const usersResult = await pool.query(`SELECT COUNT(*) AS count FROM users`);
    const pendingResult = await pool.query(
      `SELECT COUNT(*) AS count FROM users WHERE verified=false`
    );
    const contractsResult = await pool
      .query(`SELECT COUNT(*) AS count FROM projects`)
      .catch(() => ({ rows: [{ count: 0 }] }));
    const escrowResult = await pool
      .query(`SELECT COALESCE(SUM(amount),0) AS sum FROM escrows`)
      .catch(() => ({ rows: [{ sum: 0 }] }));

    res.json({
      users: parseInt(usersResult.rows[0].count, 10),
      pendingVerifications: parseInt(pendingResult.rows[0].count, 10),
      activeContracts: parseInt(contractsResult.rows[0].count, 10),
      escrow: parseFloat(escrowResult.rows[0].sum),
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------
// Get all users
// ---------------------------
const getAllUsers = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, role, country, client_type, rating, verified, created_at FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// ---------------------------
// Get single user by ID
// ---------------------------
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, role, country, client_type, rating, verified, created_at 
       FROM users WHERE id=$1`,
      [id]
    );
    if (!result.rows.length)
      return res.status(404).json({ msg: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// ---------------------------
// Update user
// ---------------------------
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      country,
      client_type,
      role,
      verified,
    } = req.body;

    const exists = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
    if (!exists.rows.length)
      return res.status(404).json({ msg: "User not found" });

    await pool.query(
      `UPDATE users SET 
        first_name=$1,
        last_name=$2,
        email=$3,
        country=$4,
        client_type=$5,
        role=$6,
        verified=$7,
        updated_at=NOW()
       WHERE id=$8`,
      [first_name, last_name, email, country, client_type, role, verified, id]
    );

    res.json({ msg: "User updated" });
  } catch (err) {
    next(err);
  }
};

// ---------------------------
// Delete user
// ---------------------------
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const exists = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
    if (!exists.rows.length)
      return res.status(404).json({ msg: "User not found" });

    await pool.query("DELETE FROM users WHERE id=$1", [id]);
    res.json({ msg: "User deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverview,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
