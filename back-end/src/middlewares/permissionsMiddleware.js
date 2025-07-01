/**
 * Middleware to check if user has write permissions
 * Viewer accounts (type=2) have read-only access
 */
const checkWritePermissions = (req, res, next) => {
  if (req.user && req.user.type === 2) {
    return res.status(403).json({
      error:
        "Viewer accounts have read-only access. Contact an administrator for write permissions.",
    });
  }
  next();
};

/**
 * Middleware to check if user can access specific user data
 * Regular users can only access their own data
 * Admins can access all data
 * Viewers can access assigned user data
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
  } else if (user.type === 2) {
    // Viewer can access assigned user data or own profile
    const viewableUserId = user.viewable_user_id || user.id;
    if (targetUserId !== viewableUserId && targetUserId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  } else {
    return res.status(403).json({ error: "Invalid user type" });
  }
};

/**
 * Helper function to determine viewable user ID based on user type
 */
const getViewableUserId = (user) => {
  if (user.type === 1) {
    // Admin can view all users
    return null; // No restriction
  } else if (user.type === 0) {
    // Regular user can only view own data
    return user.id;
  } else if (user.type === 2) {
    // Viewer can view assigned user data
    return user.viewable_user_id || user.id;
  }
  return user.id;
};

module.exports = {
  checkWritePermissions,
  checkDataAccess,
  getViewableUserId,
};
