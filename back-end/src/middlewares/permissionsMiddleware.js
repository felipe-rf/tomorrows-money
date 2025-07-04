/**
 * Middleware to check if user can access specific user data
 * Regular users can only access their own data
 * Admins can access all data
 */
const checkDataAccess = (req, res, next) => {
  const user = req.user;
  const targetUserId =
    req.params.id === "me" ? user.id : parseInt(req.params.id);

  if (user.type === 1) {
    // Admin can access all data
    next();
  } else if (user.type === 0) {
    // Regular user can only access own data
    if (targetUserId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  } else {
    return res.status(403).json({ error: "Invalid user type" });
  }
};

module.exports = {
  checkDataAccess,
};
