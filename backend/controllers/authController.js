const { sendEmail } = require("../mailer");
const crypto = require("crypto");
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// -----------------------------
// Register user
// -----------------------------
const register = async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      email,
      country,
      role,
      clientType,
      password,
      confirm_password,
    } = req.body;

    if (password !== confirm_password)
      return res.status(400).json({ msg: "Passwords do not match" });

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, country, client_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, first_name, last_name, email, role, country, client_type`,
      [first_name, last_name, email, hashed, role, country, clientType || null]
    );

    const user = result.rows[0];

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      `INSERT INTO email_verifications (user_id, otp, otp_expiry)
       VALUES ($1, $2, $3)`,
      [user.id, otp, otp_expiry]
    );

    // Send OTP via email
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome, ${first_name}!</h2>
        <p>Thanks for registering on Spaces.</p>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 3px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not sign up, ignore this email.</p>
      </div>
    `;

    const mailResult = await sendEmail(
      email,
      "Verify your Spaces account",
      html
    );

    if (!mailResult.success) {
      console.error("Failed to send OTP email:", mailResult.error);
      return res.status(500).json({
        success: false,
        msg: "Failed to send verification email. Try again later.",
      });
    }

    // Success: respond without including OTP
    res.status(201).json({
      success: true,
      message: "Account created! Check your email for the OTP.",
      user,
    });
  } catch (err) {
    if (err.code === "23505")
      return res.status(400).json({ msg: "Email already exists" });
    next(err);
  }
};

// -----------------------------
// Verify OTP
// -----------------------------
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const userRes = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    const user = userRes.rows[0];
    if (!user) return res.status(400).json({ msg: "User not found" });

    const otpRes = await pool.query(
      `SELECT * FROM email_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );
    const record = otpRes.rows[0];
    if (!record) return res.status(400).json({ msg: "No OTP found" });
    if (record.otp !== otp) return res.status(400).json({ msg: "Invalid OTP" });
    if (new Date() > new Date(record.otp_expiry))
      return res.status(400).json({ msg: "OTP expired" });

    // OTP valid: delete record and mark email_verified
    await pool.query(`DELETE FROM email_verifications WHERE id = $1`, [
      record.id,
    ]);
    await pool.query(`UPDATE users SET email_verified = true WHERE id = $1`, [
      user.id,
    ]);

    res.json({
      success: true,
      msg: "Email verified successfully! Please log in.",
      redirect: "/login", // frontend uses this to redirect
    });
  } catch (err) {
    next(err);
  }
};

// -----------------------------
// Resend OTP
// -----------------------------
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "Email required" });

    const u = await pool.query(
      `SELECT id, email_verified FROM users WHERE email = $1`,
      [email]
    );
    const user = u.rows[0];
    if (!user) return res.status(400).json({ msg: "User not found" });
    if (user.email_verified)
      return res.status(400).json({ msg: "Email already verified" });

    // Optional: enforce cooldown
    const last = await pool.query(
      `SELECT created_at FROM email_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );
    if (last.rows[0]) {
      const lastTs = new Date(last.rows[0].created_at).getTime();
      if (Date.now() - lastTs < 60 * 1000)
        return res
          .status(429)
          .json({ msg: "Wait before requesting a new code" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expiry = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `INSERT INTO email_verifications (user_id, otp, otp_expiry) VALUES ($1, $2, $3)`,
      [user.id, otp, otp_expiry]
    );

    const html = `<p>Your new verification code is <b>${otp}</b> — expires in 10 minutes.</p>`;
    const mailResult = await sendEmail(
      email,
      "Your new verification code",
      html
    );
    if (!mailResult.success)
      return res
        .status(500)
        .json({ msg: "Failed to send OTP. Try again later." });

    res.json({ success: true, msg: "OTP resent. Check your email." });
  } catch (err) {
    next(err);
  }
};

// -----------------------------
// Forgot Password - send OTP
// -----------------------------
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "Email required" });

    const userRes = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Limit OTP requests per user
    const lastOtp = await pool.query(
      `SELECT created_at FROM email_verifications 
       WHERE user_id = $1 AND purpose = 'reset' 
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    if (lastOtp.rows[0]) {
      const lastTs = new Date(lastOtp.rows[0].created_at).getTime();
      if (Date.now() - lastTs < 60 * 1000) {
        return res
          .status(429)
          .json({
            msg: "Wait at least 1 minute before requesting another OTP",
          });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in DB
    await pool.query(
      `INSERT INTO email_verifications (user_id, otp, otp_expiry, purpose)
       VALUES ($1, $2, $3, 'reset')`,
      [user.id, otp, otp_expiry]
    );

    // Send OTP via email
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Password Reset Request</h2>
        <p>Your password reset code is:</p>
        <h1 style="letter-spacing: 3px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, ignore this email.</p>
      </div>
    `;
    const mailResult = await sendEmail(
      email,
      "Reset your Spaces password",
      html
    );

    if (!mailResult.success) {
      console.error("Failed to send OTP email:", mailResult.error);
      return res
        .status(500)
        .json({ msg: "Failed to send OTP. Try again later." });
    }

    res.json({ success: true, msg: "OTP sent to your email" });
  } catch (err) {
    next(err);
  }
};

// -----------------------------
// Reset Password - verify OTP
// -----------------------------
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ msg: "All fields are required" });

    const userRes = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ msg: "User not found" });

    const otpRes = await pool.query(
      `SELECT * FROM email_verifications 
       WHERE user_id = $1 AND purpose = 'reset'
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );
    const record = otpRes.rows[0];

    if (!record) return res.status(400).json({ msg: "No OTP found" });
    if (record.otp !== otp) return res.status(400).json({ msg: "Invalid OTP" });
    if (new Date() > new Date(record.otp_expiry))
      return res.status(400).json({ msg: "OTP expired" });

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
      hashed,
      user.id,
    ]);

    // Delete used OTP
    await pool.query(`DELETE FROM email_verifications WHERE id = $1`, [
      record.id,
    ]);

    res.json({
      success: true,
      msg: "Password reset successfully. You can now login.",
    });
  } catch (err) {
    next(err);
  }
};

// -----------------------------
// Login user
// -----------------------------
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    const user = result.rows[0];

    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        error:
          "Email not verified. Please verify your email before logging in.",
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        country: user.country,
        client_type: user.client_type,
        email_verified: user.email_verified,
      },
    });
  } catch (err) {
    next(err);
  }
};

// -----------------------------
// Create Admin (unchanged)
// -----------------------------
const createAdmin = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, secret } = req.body;

    if (secret !== process.env.ADMIN_CREATION_SECRET)
      return res.status(403).json({ msg: "Not authorized to create admin" });

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, first_name, last_name, email, role`,
      [first_name, last_name, email, hashed]
    );

    const admin = result.rows[0];

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, user: admin });
  } catch (err) {
    if (err.code === "23505")
      return res.status(400).json({ msg: "Email already exists" });
    next(err);
  }
};

module.exports = {
  register,
  login,
  createAdmin,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
};
