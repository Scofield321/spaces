const { submitVerification } = require("./verificationController");

// Wrapper for freelancer-specific logic if needed
exports.submitFreelancerVerification = async (req, res) => {
  req.body.user_role = "freelancer";
  await submitVerification(req, res);
};
