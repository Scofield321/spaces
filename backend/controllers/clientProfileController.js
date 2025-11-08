const supabase = require("../config/superbase");
const pool = require("../config/db");

// ---------- GET CLIENT PROFILE ----------
const getProfile = async (req, res, next) => {
  try {
    const clientId = req.user.id;

    const result = await pool.query(
      `SELECT 
        u.id, u.first_name, u.last_name, u.email, u.profile_picture,
        u.verified AS client_verified,
        cp.company_name, cp.company_description, cp.city, cp.address, cp.domain,
        CASE 
          WHEN u.verified = true THEN 'verified'
          ELSE COALESCE(cp.verification_status, 'pending')
        END AS verification_status,
        cp.verification_reason
      FROM users u
      LEFT JOIN client_profiles cp ON cp.user_id = u.id
      WHERE u.id=$1`,
      [clientId]
    );

    if (!result.rows.length)
      return res.status(404).json({ msg: "Client profile not found" });

    const user = result.rows[0];
    user.client_verified =
      user.client_verified === true || user.client_verified === "t";

    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// ---------- GET PROFILE BY ID (for admin or freelancers) ----------
const getProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        u.id, u.first_name, u.last_name, u.email, u.profile_picture,
        u.verified AS client_verified,
        cp.company_name, cp.company_description, cp.city, cp.address, cp.domain,
        CASE 
          WHEN u.verified = true THEN 'verified'
          ELSE COALESCE(cp.verification_status, 'pending')
        END AS verification_status,
        cp.verification_reason
      FROM users u
      LEFT JOIN client_profiles cp ON cp.user_id = u.id
      WHERE u.id=$1`,
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ msg: "Client profile not found" });

    const user = result.rows[0];
    user.client_verified =
      user.client_verified === true || user.client_verified === "t";

    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// ---------- UPDATE CLIENT PROFILE ----------
const updateProfile = async (req, res, next) => {
  try {
    const clientId = req.user.id;
    const {
      profile_picture,
      company_name,
      company_description,
      city,
      address,
      domain,
    } = req.body;

    // Update users table for profile picture
    if (profile_picture) {
      await pool.query(
        `UPDATE users SET profile_picture=$1, updated_at=NOW() WHERE id=$2`,
        [profile_picture, clientId]
      );
    }

    // Insert or update client profile table
    await pool.query(
      `INSERT INTO client_profiles (user_id, company_name, company_description, city, address, domain)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id) DO UPDATE SET
         company_name=$2,
         company_description=$3,
         city=$4,
         address=$5,
         domain=$6,
         updated_at=NOW()`,
      [
        clientId,
        company_name || null,
        company_description || null,
        city || null,
        address || null,
        domain || null,
      ]
    );

    res.json({ msg: "Client profile updated successfully" });
  } catch (err) {
    next(err);
  }
};

// ---------- UPLOAD PROFILE PICTURE ----------
const uploadProfilePicture = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) return res.status(400).json({ msg: "No file uploaded" });

    const fileName = `${userId}/profile-${Date.now()}-${file.originalname}`;

    // Upload to Supabase
    const { error } = await supabase.storage
      .from("user-verifications")
      .upload(fileName, file.buffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.mimetype,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("user-verifications")
      .getPublicUrl(fileName);

    const profileUrl = data.publicURL;

    // Update users table
    await pool.query(
      `UPDATE users SET profile_picture=$1, updated_at=NOW() WHERE id=$2`,
      [profileUrl, userId]
    );

    res.json({ success: true, url: profileUrl });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  getProfileById,
  updateProfile,
  uploadProfilePicture,
};
