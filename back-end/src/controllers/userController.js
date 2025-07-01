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
    console.log("🔍 User info:", req.user);
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

    console.log("🔍 Built where clause:", where);
    return where;
  }

  /**
   * Create a new user (Admin only)
   * POST /api/users
   */
  static async create(req, res) {
    const transaction = await sequelize.transaction();

    try {
      console.log("📝 Request body:", req.body);

      // Only admins can create users
      if (req.user.type !== 1) {
        await transaction.rollback();
        return res
          .status(403)
          .json({ error: "Only administrators can create users" });
      }

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

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const userData = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        type: type || "user",
        active: active !== undefined ? active : true,
        viewable_user_id: type === "viewer" ? viewable_user_id : null,
      };

      console.log("👤 User data:", { ...userData, password: "[HIDDEN]" });

      const newUser = await User.create(userData, { transaction });

      await transaction.commit();

      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser.toJSON();
      return res.status(201).json(userWithoutPassword);
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

      const where = UserController.buildUserFilter(req, { id: userId });

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
   * Delete a user (Admin only, cannot delete self)
   * DELETE /api/users/:id
   */
  static async delete(req, res) {
    const transaction = await sequelize.transaction();

    try {
      // Only admins can delete users
      if (req.user.type !== 1) {
        await transaction.rollback();
        return res
          .status(403)
          .json({ error: "Only administrators can delete users" });
      }

      // Cannot delete self
      if (parseInt(req.params.id) === req.user.id) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ error: "Cannot delete your own account" });
      }

      const user = await User.findOne({
        where: { id: req.params.id },
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
          suggestion: "Consider deactivating the user instead of deleting",
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

      const where = UserController.buildUserFilter(req, { id: userId });

      const user = await User.findOne({ where });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user statistics
      const stats = await Promise.all([
        Transaction.count({ where: { user_id: user.id } }),
        Transaction.sum("amount", {
          where: { user_id: user.id, type: "income" },
        }),
        Transaction.sum("amount", {
          where: { user_id: user.id, type: "expense" },
        }),
        Category.count({ where: { user_id: user.id } }),
        Goal.count({ where: { user_id: user.id } }),
        Goal.count({ where: { user_id: user.id, is_completed: true } }),
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
          id: user.id,
          name: user.name,
          email: user.email,
          type: user.type,
          active: user.active,
          member_since: user.created_at,
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
      };

      return res.json(userStats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      return res.status(500).json({ error: "Failed to fetch user stats" });
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
