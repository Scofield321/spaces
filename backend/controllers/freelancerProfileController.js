const supabase = require("../config/superbase");
const pool = require("../config/db");

// ---------- GET FREELANCER PROFILE ----------
const getProfile = async (req, res, next) => {
  try {
    const freelancerId = req.user.id;

    const result = await pool.query(
      `SELECT 
        u.id, u.first_name, u.last_name, u.email, u.profile_picture, u.rating,
        u.verified AS freelancer_verified,
        fp.city, fp.title, fp.overview, fp.hourly_rate, fp.service_rate,
        fp.portfolio_images,
        CASE 
          WHEN u.verified = true THEN 'verified'
          ELSE COALESCE(fp.verification_status, 'pending')
        END AS verification_status,
        fp.verification_reason, fp.national_id_url, fp.proof_links
      FROM users u
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      WHERE u.id=$1`,
      [freelancerId]
    );

    if (!result.rows.length)
      return res.status(404).json({ msg: "Freelancer profile not found" });

    const user = result.rows[0];

    // Ensure boolean for frontend
    user.freelancer_verified =
      user.freelancer_verified === true || user.freelancer_verified === "t";

    const skills = await pool.query(
      `SELECT id, skill_name FROM skills WHERE freelancer_id=$1`,
      [freelancerId]
    );

    const projects = await pool.query(
      `SELECT id, title, description, link, created_at, image_urls, video_url
       FROM freelancer_projects 
       WHERE freelancer_id=$1 
       ORDER BY created_at DESC`,
      [freelancerId]
    );

    res.json({
      user,
      skills: skills.rows,
      projects: projects.rows,
      portfolio_images: user.portfolio_images || [], // Add portfolio images here
    });
  } catch (err) {
    next(err);
  }
};

// ---------- GET PROFILE BY ID (client view) ----------
const getProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        u.id, u.first_name, u.last_name, u.email, u.profile_picture, u.rating,
        u.verified AS freelancer_verified,
        fp.city, fp.title, fp.overview, fp.hourly_rate, fp.service_rate,
        fp.portfolio_images,
        fp.verification_status, fp.national_id_url, fp.proof_links
      FROM users u
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      WHERE u.id=$1`,
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ msg: "Freelancer profile not found" });

    const user = result.rows[0];

    // Ensure boolean for frontend
    user.freelancer_verified =
      user.freelancer_verified === true || user.freelancer_verified === "t";

    const skills = await pool.query(
      `SELECT id, skill_name FROM skills WHERE freelancer_id=$1`,
      [id]
    );

    const projects = await pool.query(
      `SELECT id, title, description, link, created_at, image_urls, video_url 
       FROM freelancer_projects 
       WHERE freelancer_id=$1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      user,
      skills: skills.rows,
      projects: projects.rows,
      portfolio_images: user.portfolio_images || [], // Return portfolio images here
    });
  } catch (err) {
    next(err);
  }
};

// ---------- UPDATE PROFILE (User general info + Freelancer details) ----------
const updateProfile = async (req, res, next) => {
  try {
    const freelancerId = req.user.id;
    const {
      profile_picture,
      city,
      title,
      overview,
      hourly_rate,
      service_rate,
      national_id_url,
      proof_links,
      skills,
      projects,
    } = req.body;

    // ------------------- Upsert skills -------------------
    if (Array.isArray(skills) && skills.length > 0) {
      // Delete old skills
      await pool.query(`DELETE FROM skills WHERE freelancer_id=$1`, [
        freelancerId,
      ]);

      // Insert new skills
      const skillValues = skills.map((_, i) => `($1, $${i + 2})`).join(",");
      const skillParams = [freelancerId, ...skills.map((s) => s.skill_name)];
      if (skillValues) {
        await pool.query(
          `INSERT INTO skills (freelancer_id, skill_name) VALUES ${skillValues}`,
          skillParams
        );
      }
    }

    // ------------------- Upsert projects -------------------
    if (Array.isArray(projects) && projects.length > 0) {
      await pool.query(
        `DELETE FROM freelancer_projects WHERE freelancer_id=$1`,
        [freelancerId]
      );

      const projectValues = projects
        .map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`)
        .join(",");

      const projectParams = [
        freelancerId,
        ...projects.flatMap((p) => [
          p.title,
          p.description || "",
          p.link || "",
        ]),
      ];

      if (projectValues) {
        await pool.query(
          `INSERT INTO freelancer_projects (freelancer_id, title, description, link) VALUES ${projectValues}`,
          projectParams
        );
      }
    }

    // ------------------- Update users table -------------------
    if (profile_picture) {
      await pool.query(
        `UPDATE users SET profile_picture=$1, updated_at=NOW() WHERE id=$2`,
        [profile_picture, freelancerId]
      );
    }

    // ------------------- Upsert freelancer_profiles -------------------
    await pool.query(
      `INSERT INTO freelancer_profiles (
        user_id, city, title, overview, hourly_rate, service_rate, national_id_url, proof_links
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (user_id) DO UPDATE SET 
        city=$2, title=$3, overview=$4, hourly_rate=$5, service_rate=$6,
        national_id_url=$7, proof_links=$8, updated_at=NOW()`,
      [
        freelancerId,
        city || null,
        title || null,
        overview || null,
        hourly_rate || null,
        service_rate || null,
        national_id_url || null,
        proof_links || null,
      ]
    );

    res.json({ msg: "Profile updated successfully" });
  } catch (err) {
    next(err);
  }
};

// ---------- ADD SKILL ----------
const addSkill = async (req, res, next) => {
  try {
    const freelancerId = req.user.id;
    const { skill_name } = req.body;

    if (!skill_name)
      return res.status(400).json({ msg: "Skill name is required" });

    const result = await pool.query(
      `INSERT INTO skills (freelancer_id, skill_name) VALUES ($1, $2) RETURNING id, skill_name`,
      [freelancerId, skill_name]
    );

    res.status(201).json({ skill: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ---------- REMOVE SKILL ----------
const removeSkill = async (req, res, next) => {
  try {
    const freelancerId = req.user.id;
    const { id } = req.params;

    await pool.query(`DELETE FROM skills WHERE id=$1 AND freelancer_id=$2`, [
      id,
      freelancerId,
    ]);

    res.json({ msg: "Skill removed" });
  } catch (err) {
    next(err);
  }
};

// ---------- ADD PROJECT ----------
const addProject = async (req, res, next) => {
  try {
    const freelancerId = req.user.id;
    const { title, description, link } = req.body;

    if (!title)
      return res.status(400).json({ msg: "Project title is required" });

    const result = await pool.query(
      `INSERT INTO freelancer_projects (freelancer_id, title, description, link) 
       VALUES ($1,$2,$3,$4) RETURNING id, title, description, link, created_at`,
      [freelancerId, title, description || "", link || ""]
    );

    res.status(201).json({ project: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ---------- REMOVE PROJECT ----------
const removeProject = async (req, res, next) => {
  try {
    const freelancerId = req.user.id;
    const { id } = req.params;

    await pool.query(
      `DELETE FROM freelancer_projects WHERE id=$1 AND freelancer_id=$2`,
      [id, freelancerId]
    );

    res.json({ msg: "Project removed" });
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

const uploadPortfolioImages = async (req, res, next) => {
  try {
    const freelancerId = req.user.id;
    const files = req.files;

    if (!files || !files.length)
      return res.status(400).json({ message: "No files uploaded" });

    const urls = [];

    for (const file of files) {
      const fileName = `portfolio/${freelancerId}/${Date.now()}-${
        file.originalname
      }`;

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

      // Make sure to push a valid URL
      if (data?.publicURL) urls.push(data.publicURL);
    }

    // Remove any null or undefined URLs before saving
    const cleanUrls = urls.filter(Boolean);

    // Append the new URLs to the existing portfolio_images array
    await pool.query(
      `UPDATE freelancer_profiles
       SET portfolio_images = ARRAY_REMOVE(COALESCE(portfolio_images, '{}') || $1, NULL)
       WHERE user_id = $2`,
      [cleanUrls, freelancerId]
    );

    res.json({
      message: "Portfolio images uploaded successfully",
      urls: cleanUrls,
    });
  } catch (err) {
    console.error("Portfolio upload error:", err);
    next(err);
  }
};

const deletePortfolioImage = async (req, res, next) => {
  try {
    const freelancerId = req.user.id;
    const { url } = req.body;

    if (!url) return res.status(400).json({ message: "Image URL required" });

    // Remove from DB array
    await pool.query(
      `UPDATE freelancer_profiles
       SET portfolio_images = array_remove(portfolio_images, $1)
       WHERE user_id = $2`,
      [url, freelancerId]
    );

    // Optionally: delete from Supabase storage
    const path = url.split("/object/public/user-verifications/")[1];
    if (path) {
      await supabase.storage.from("user-verifications").remove([path]);
    }

    res.json({ success: true, message: "Image deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getProfileById,
  addSkill,
  removeSkill,
  addProject,
  removeProject,
  uploadProfilePicture,
  uploadPortfolioImages,
  deletePortfolioImage,
};
