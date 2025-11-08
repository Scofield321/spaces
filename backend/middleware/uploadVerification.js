const multer = require("multer");
const path = require("path");

// Accept jpg, png, pdf
const uploadVerificationDocs = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, "../uploads/verifications"));
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|pdf)$/;
    if (!allowed.test(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error("Only images or PDFs allowed"));
    }
    cb(null, true);
  },
});

module.exports = { uploadVerificationDocs };
