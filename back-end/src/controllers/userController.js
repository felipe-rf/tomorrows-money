const { User } = require("../models/User");
const { Transaction } = require("../models/Transaction");
const { Category } = require("../models/Category");
const { Goal } = require("../models/Goal");
const { sequelize } = require("../config/sequelize");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const { getViewableUserId } = require("../middlewares/permissionsMiddleware");

class UserController {
  /**
   * Helper method to build where clause based on user type
   */
  static buildUserFilter(req, additionalWhere = {}) {
    const user_id = req.user.id;
    const user_type = req.user.type;

    let where = { ...additionalWhere };

    // If user type is 0 (regular user), can only access their own profile
    // If user type is 1 (admin), can access all users
    // If user type is 2 (viewer), can access assigned user data
    if (user_type === 0) {
      where.id = user_id;
    } else if (user_type === 2) {
      const viewableUserId = req.user.viewable_user_id || user_id;
      where.id = viewableUserId;
    }
    // Admin (type=1) has no restrictions

    return where;
  }

  /**
   * Create a new user
   * POST /api/users
   * - Admins can create users of any type
   * - Regular users (type 0) can create viewer users (type 2) that view their data
   */
  static async create(req, res) {
    const transaction = await sequelize.transaction();

    try {
      if (!req.body) {
        await transaction.rollback();
        return res.status(400).json({ error: "Request body is required" });
      }

      const { name, email, password, type, active, viewable_user_id } =
        req.body;

      // Validate required fields
      if (!name || !email || !password) {
        await transaction.rollback();
        return res.status(400).json({
          error: "Missing required fields: name, email, password",
        });
      }

      // Validate user permissions and type restrictions
      const requestedType = parseInt(type) || 0; // Default to user type
      const currentUserType = req.user.type;
      const currentUserId = req.user.id;

      // Check if user has permission to create the requested type
      if (currentUserType === 1) {
        // Admin can create any type of user
        // No restrictions for admins
      } else if (currentUserType === 0) {
        // Regular user can only create viewer users (type 2)
        if (requestedType !== 2) {
          await transaction.rollback();
          return res.status(403).json({
            error: "Regular users can only create viewer accounts (type 2)",
            allowed_types: [2],
            requested_type: requestedType,
          });
        }

        // For regular users creating viewers, the viewer must view their data
        if (viewable_user_id && viewable_user_id !== currentUserId) {
          await transaction.rollback();
          return res.status(403).json({
            error: "You can only create viewers for your own account",
            your_user_id: currentUserId,
            requested_viewable_id: viewable_user_id,
          });
        }
      } else {
        // Viewer users (type 2) cannot create other users
        await transaction.rollback();
        return res.status(403).json({
          error: "Viewer accounts cannot create other users",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        await transaction.rollback();
        return res.status(400).json({ error: "Invalid email format" });
      }

      // Check if email already exists
      const existingUser = await User.findOne({
        where: { email: email.toLowerCase().trim() },
        transaction,
      });

      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json({ error: "Email already exists" });
      }

      // Validate password strength
      if (password.length < 6) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long" });
      }

      // Validate viewable_user_id for viewer accounts
      let finalViewableUserId = null;
      if (requestedType === 2) {
        if (currentUserType === 0) {
          // Regular user creating viewer: viewer must view them
          finalViewableUserId = currentUserId;
        } else if (currentUserType === 1) {
          // Admin creating viewer: can specify any valid user
          if (viewable_user_id) {
            const viewableUser = await User.findByPk(viewable_user_id, {
              transaction,
            });
            if (!viewableUser) {
              await transaction.rollback();
              return res.status(400).json({
                error: "Specified viewable user does not exist",
                viewable_user_id: viewable_user_id,
              });
            }
            finalViewableUserId = viewable_user_id;
          } else {
            await transaction.rollback();
            return res.status(400).json({
              error:
                "viewable_user_id is required when creating viewer accounts",
            });
          }
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const userData = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        type: requestedType,
        active: active !== undefined ? active : true,
        viewable_user_id: finalViewableUserId,
      };

      const newUser = await User.create(userData, { transaction });

      await transaction.commit();

      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser.toJSON();

      // Add creation context for response
      const responseData = {
        ...userWithoutPassword,
        created_by: {
          id: currentUserId,
          type: currentUserType,
          type_name:
            currentUserType === 1
              ? "admin"
              : currentUserType === 0
              ? "user"
              : "viewer",
        },
      };

      return res.status(201).json(responseData);
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating user:", error);
      return res
        .status(500)
        .json({ error: "Failed to create user", details: error.message });
    }
  }

  /**
   * Get all users with RESTful query parameters for filtering
   * GET /api/users?active=true&type=user&summary=true
   */
  static async getAll(req, res) {
    try {
      // Only admins can list all users
      if (req.user.type !== 1) {
        return res
          .status(403)
          .json({ error: "Only administrators can list all users" });
      }

      const {
        page = 1,
        limit = 10,
        type,
        active,
        search,
        // RESTful query params for additional functionality
        summary,
        with_stats,
      } = req.query;

      // Handle summary request (RESTful: GET /api/users?summary=true)
      if (summary === "true") {
        return UserController.handleSummary(req, res);
      }

      // Handle with_stats request (RESTful: GET /api/users?with_stats=true)
      if (with_stats === "true") {
        return UserController.handleWithStats(req, res);
      }

      // Handle search (RESTful: GET /api/users?search=john)
      if (search) {
        return UserController.handleSearch(req, res, search, limit);
      }

      // Build base where clause
      let whereConditions = {};

      if (type) whereConditions.type = type;
      if (active !== undefined) whereConditions.active = active === "true";

      // Calculate pagination
      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows } = await User.findAndCountAll({
        where: whereConditions,
        limit: Number(limit),
        offset,
        order: [
          ["active", "DESC"], // Active users first
          ["type", "ASC"], // Admins first, then users
          ["created_at", "DESC"],
        ],
        attributes: { exclude: ["password"] }, // Never return passwords
      });

      return res.json({
        total: count,
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        data: rows,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  /**
   * Get a single user by ID (or current user profile)
   * GET /api/users/:id
   * GET /api/users/me (alias for current user)
   */
  static async getById(req, res) {
    try {
      const userId = req.params.id === "me" ? req.user.id : req.params.id;
      const currentUserType = req.user.type;
      const currentUserId = req.user.id;

      // For viewer users requesting their own profile, return their actual profile
      // For other requests, use the normal permission filtering
      let targetUserId;
      let where;

      if (req.params.id === "me") {
        // Always return the current user's own profile when requesting "me"
        targetUserId = currentUserId;
        where = { id: targetUserId };
      } else {
        // For specific user requests, apply normal permission filtering
        where = UserController.buildUserFilter(req, { id: userId });
        targetUserId = userId;
      }

      const user = await User.findOne({
        where,
        attributes: { exclude: ["password"] },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  }

  /**
   * Update a user
   * PUT /api/users/:id
   * PUT /api/users/me (alias for current user)
   */
  static async update(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const userId = req.params.id === "me" ? req.user.id : req.params.id;

      const where = UserController.buildUserFilter(req, { id: userId });

      const existingUser = await User.findOne({
        where,
        transaction,
      });

      if (!existingUser) {
        await transaction.rollback();
        return res.status(404).json({ error: "User not found" });
      }

      // Regular users can only update their own profile and limited fields
      const allowedFields =
        req.user.type === 1
          ? ["name", "email", "password", "type", "active"] // Admin can update all
          : ["name", "email", "password"]; // Regular user limited fields

      const updateData = {};

      // Filter allowed fields
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      // Validate email if being updated
      if (updateData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          await transaction.rollback();
          return res.status(400).json({ error: "Invalid email format" });
        }

        updateData.email = updateData.email.toLowerCase().trim();

        // Check if new email conflicts with existing user
        if (updateData.email !== existingUser.email) {
          const emailConflict = await User.findOne({
            where: {
              email: updateData.email,
              id: { [Op.ne]: existingUser.id },
            },
            transaction,
          });

          if (emailConflict) {
            await transaction.rollback();
            return res.status(400).json({ error: "Email already exists" });
          }
        }
      }

      // Hash password if being updated
      if (updateData.password) {
        if (updateData.password.length < 6) {
          await transaction.rollback();
          return res
            .status(400)
            .json({ error: "Password must be at least 6 characters long" });
        }
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      // Trim name if provided
      if (updateData.name) {
        updateData.name = updateData.name.trim();
      }

      await existingUser.update(updateData, { transaction });

      await transaction.commit();

      // Return updated user without password
      const { password: _, ...userWithoutPassword } = existingUser.toJSON();
      return res.json(userWithoutPassword);
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating user:", error);
      return res.status(500).json({ error: "Failed to update user" });
    }
  }

  /**
   * Delete a user
   * DELETE /api/users/:id
   * - Admins can delete any user (including themselves)
   * - Other user types can only delete their own account
   */
  static async delete(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const requestedUserId = parseInt(req.params.id);
      const currentUserId = req.user.id;
      const currentUserType = req.user.type;

      // Special case: Allow viewers to delete their own account
      // This bypasses any general read-only restrictions for self-deletion
      if (currentUserType === 2 && requestedUserId === currentUserId) {
        // Viewer deleting their own account - allowed
      } else if (currentUserType !== 1) {
        // Non-admin users can only delete their own account
        if (requestedUserId !== currentUserId) {
          await transaction.rollback();
          return res
            .status(403)
            .json({ error: "You can only delete your own account" });
        }
      }
      // Admins can delete any user (including themselves)

      const user = await User.findOne({
        where: { id: requestedUserId },
        transaction,
      });

      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user has data that would be orphaned
      const userDataCount = await Promise.all([
        Transaction.count({ where: { user_id: user.id }, transaction }),
        Category.count({ where: { user_id: user.id }, transaction }),
        Goal.count({ where: { user_id: user.id }, transaction }),
      ]);

      const [transactionCount, categoryCount, goalCount] = userDataCount;
      const totalData = transactionCount + categoryCount + goalCount;

      if (totalData > 0) {
        await transaction.rollback();
        return res.status(400).json({
          error: "Cannot delete user with existing data",
          details: {
            transactions: transactionCount,
            categories: categoryCount,
            goals: goalCount,
            total: totalData,
          },
          suggestion: "Delete all user data first before deleting the account",
        });
      }

      await user.destroy({ transaction });
      await transaction.commit();

      return res.status(204).send();
    } catch (error) {
      await transaction.rollback();
      console.error("Error deleting user:", error);
      return res.status(500).json({ error: "Failed to delete user" });
    }
  }

  /**
   * Deactivate a user (soft delete alternative)
   * POST /api/users/:id/deactivate
   */
  static async deactivate(req, res) {
    try {
      // Only admins can deactivate users
      if (req.user.type !== 1) {
        return res
          .status(403)
          .json({ error: "Only administrators can deactivate users" });
      }

      // Cannot deactivate self
      if (parseInt(req.params.id) === req.user.id) {
        return res
          .status(400)
          .json({ error: "Cannot deactivate your own account" });
      }

      const user = await User.findByPk(req.params.id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.active) {
        return res.status(400).json({ error: "User is already deactivated" });
      }

      await user.update({ active: false });

      const { password: _, ...userWithoutPassword } = user.toJSON();
      return res.json({
        ...userWithoutPassword,
        message: "User deactivated successfully",
      });
    } catch (error) {
      console.error("Error deactivating user:", error);
      return res.status(500).json({ error: "Failed to deactivate user" });
    }
  }

  /**
   * Reactivate a user
   * POST /api/users/:id/activate
   */
  static async activate(req, res) {
    try {
      // Only admins can activate users
      if (req.user.type !== 1) {
        return res
          .status(403)
          .json({ error: "Only administrators can activate users" });
      }

      const user = await User.findByPk(req.params.id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.active) {
        return res.status(400).json({ error: "User is already active" });
      }

      await user.update({ active: true });

      const { password: _, ...userWithoutPassword } = user.toJSON();
      return res.json({
        ...userWithoutPassword,
        message: "User activated successfully",
      });
    } catch (error) {
      console.error("Error activating user:", error);
      return res.status(500).json({ error: "Failed to activate user" });
    }
  }

  /**
   * Get user statistics (sub-resource)
   * GET /api/users/:id/stats
   */
  static async getStats(req, res) {
    try {
      const userId = req.params.id === "me" ? req.user.id : req.params.id;
      const currentUserType = req.user.type;
      const currentUserId = req.user.id;

      // For viewer users (type 2), get stats for the user they're viewing
      let targetUserId = userId;
      if (currentUserType === 2) {
        if (
          req.params.id === "me" ||
          parseInt(req.params.id) === currentUserId
        ) {
          // Viewer requesting their own stats - return viewable user's stats instead
          targetUserId = req.user.viewable_user_id || currentUserId;
        } else {
          // Viewer trying to access someone else's stats
          const requestedUserId = parseInt(req.params.id);
          const viewableUserId = req.user.viewable_user_id || currentUserId;

          if (requestedUserId !== viewableUserId) {
            return res.status(403).json({
              error: "Viewer can only access their assigned user's statistics",
              your_viewable_user_id: viewableUserId,
              requested_user_id: requestedUserId,
            });
          }
          targetUserId = requestedUserId;
        }
      } else {
        // For regular users and admins, use normal permission filtering
        const where = UserController.buildUserFilter(req, { id: userId });
        const user = await User.findOne({ where });

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        targetUserId = user.id;
      }

      // Get the target user for stats
      const targetUser = await User.findByPk(targetUserId);

      if (!targetUser) {
        return res.status(404).json({ error: "Target user not found" });
      }

      // Get user statistics for the target user
      const stats = await Promise.all([
        Transaction.count({ where: { user_id: targetUser.id } }),
        Transaction.sum("amount", {
          where: { user_id: targetUser.id, type: "income" },
        }),
        Transaction.sum("amount", {
          where: { user_id: targetUser.id, type: "expense" },
        }),
        Category.count({ where: { user_id: targetUser.id } }),
        Goal.count({ where: { user_id: targetUser.id } }),
        Goal.count({ where: { user_id: targetUser.id, is_completed: true } }),
      ]);

      const [
        totalTransactions,
        totalIncome,
        totalExpenses,
        totalCategories,
        totalGoals,
        completedGoals,
      ] = stats;

      const userStats = {
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          type: targetUser.type,
          active: targetUser.active,
          member_since: targetUser.created_at,
        },
        financial: {
          total_transactions: totalTransactions || 0,
          total_income: parseFloat(totalIncome) || 0,
          total_expenses: parseFloat(totalExpenses) || 0,
          net_balance:
            (parseFloat(totalIncome) || 0) - (parseFloat(totalExpenses) || 0),
        },
        organization: {
          total_categories: totalCategories || 0,
        },
        goals: {
          total_goals: totalGoals || 0,
          completed_goals: completedGoals || 0,
          completion_rate:
            totalGoals > 0
              ? Math.round((completedGoals / totalGoals) * 100)
              : 0,
        },
        // Add context about who is viewing (for viewer users)
        viewer_context:
          currentUserType === 2
            ? {
                viewer_id: currentUserId,
                viewing_user_id: targetUser.id,
                is_viewing_assigned_user: true,
              }
            : undefined,
      };

      return res.json(userStats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      return res.status(500).json({ error: "Failed to fetch user stats" });
    }
  }

  /**
   * Delete current user's own account (self-deletion)
   * DELETE /api/users/me
   * - Any user type can delete their own account
   * - Bypasses viewer read-only restrictions for self-deletion
   */
  static async deleteSelf(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const currentUserId = req.user.id;

      const user = await User.findOne({
        where: { id: currentUserId },
        transaction,
      });

      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user has data that would be orphaned
      const userDataCount = await Promise.all([
        Transaction.count({ where: { user_id: user.id }, transaction }),
        Category.count({ where: { user_id: user.id }, transaction }),
        Goal.count({ where: { user_id: user.id }, transaction }),
      ]);

      const [transactionCount, categoryCount, goalCount] = userDataCount;
      const totalData = transactionCount + categoryCount + goalCount;

      if (totalData > 0) {
        await transaction.rollback();
        return res.status(400).json({
          error: "Cannot delete user with existing data",
          details: {
            transactions: transactionCount,
            categories: categoryCount,
            goals: goalCount,
            total: totalData,
          },
          suggestion: "Delete all user data first before deleting the account",
        });
      }

      await user.destroy({ transaction });
      await transaction.commit();

      return res.status(204).send();
    } catch (error) {
      await transaction.rollback();
      console.error("Error deleting user:", error);
      return res.status(500).json({ error: "Failed to delete user" });
    }
  }

  // ===== HELPER METHODS (PRIVATE) =====

  /**
   * Handle summary request (RESTful: GET /api/users?summary=true)
   */
  static async handleSummary(req, res) {
    try {
      // Get overall user statistics
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { active: true } });
      const inactiveUsers = totalUsers - activeUsers;
      const adminUsers = await User.count({ where: { type: "admin" } });
      const regularUsers = await User.count({ where: { type: "user" } });

      // Get recent registrations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentRegistrations = await User.count({
        where: {
          created_at: { [Op.gte]: thirtyDaysAgo },
        },
      });

      return res.json({
        overview: {
          total_users: totalUsers,
          active_users: activeUsers,
          inactive_users: inactiveUsers,
          activation_rate:
            totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
        },
        by_type: {
          admin_users: adminUsers,
          regular_users: regularUsers,
        },
        recent_activity: {
          registrations_last_30_days: recentRegistrations,
        },
      });
    } catch (error) {
      console.error("Error fetching users summary:", error);
      return res.status(500).json({ error: "Failed to fetch users summary" });
    }
  }

  /**
   * Handle with_stats request (RESTful: GET /api/users?with_stats=true)
   */
  static async handleWithStats(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const users = await User.findAll({
        limit: Number(limit),
        offset,
        order: [["created_at", "DESC"]],
        attributes: { exclude: ["password"] },
      });

      // Get stats for each user
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const [transactionCount, goalCount, completedGoals] =
            await Promise.all([
              Transaction.count({ where: { user_id: user.id } }),
              Goal.count({ where: { user_id: user.id } }),
              Goal.count({ where: { user_id: user.id, is_completed: true } }),
            ]);

          return {
            ...user.toJSON(),
            stats: {
              transactions: transactionCount,
              goals: goalCount,
              completed_goals: completedGoals,
            },
          };
        })
      );

      const total = await User.count();

      return res.json({
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        data: usersWithStats,
      });
    } catch (error) {
      console.error("Error fetching users with stats:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch users with stats" });
    }
  }

  /**
   * Handle search request (RESTful: GET /api/users?search=john)
   */
  static async handleSearch(req, res, searchTerm, limit) {
    try {
      const users = await User.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.iLike]: `%${searchTerm}%` } },
            { email: { [Op.iLike]: `%${searchTerm}%` } },
          ],
        },
        order: [
          [
            sequelize.literal(
              `CASE WHEN LOWER(name) = '${searchTerm.toLowerCase()}' THEN 0 ELSE 1 END`
            ),
          ],
          [
            sequelize.literal(
              `CASE WHEN LOWER(email) = '${searchTerm.toLowerCase()}' THEN 0 ELSE 1 END`
            ),
          ],
          ["name", "ASC"],
        ],
        limit: Number(limit),
        attributes: { exclude: ["password"] },
      });

      return res.json({
        data: users,
        search_term: searchTerm,
      });
    } catch (error) {
      console.error("Error searching users:", error);
      return res.status(500).json({ error: "Failed to search users" });
    }
  }
}

module.exports = { UserController };
