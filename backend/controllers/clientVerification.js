const { submitVerification } = require("./verificationController");

// Wrapper for client-specific logic
exports.submitClientVerification = async (req, res) => {
  req.body.user_role = "client";
  await submitVerification(req, res);
};
