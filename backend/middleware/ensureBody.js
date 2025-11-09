const ensureBody = (req, res, next) => {
  if (!req.body) req.body = {};
  next();
};

module.exports = { ensureBody };
