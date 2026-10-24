// Only lets the request through if someone is logged on.
const authMiddleware = (req, res, next) => {
  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

module.exports = authMiddleware;
