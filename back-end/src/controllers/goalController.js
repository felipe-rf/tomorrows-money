const { Goal } = require("../models/Goal");
const { User } = require("../models/User");
const { Category } = require("../models/Category");
const { Transaction } = require("../models/Transaction");
const { sequelize } = require("../config/sequelize");
const { Op } = require("sequelize");

class GoalController {
  /**
   * Helper method to build where clause based on user type
   */
  static buildUserFilter(req, additionalWhere = {}) {
    const user_id = req.user.id;
    const user_type = req.user.type;

    let where = { ...additionalWhere };

    // If user type is 0 (regular user), filter by user_id
    // If user type is 1 (admin), no user filter needed unless specified
    if (user_type === 0) {
      where.user_id = user_id;
    }

    return where;
  }

  /**
   * Create a new goal
   * POST /api/goals
   */
  static async create(req, res) {
    // Check write permissions for viewers
    if (req.user.type === 2) {
      return res.status(403).json({
        error:
          "Viewer accounts have read-only access. Contact an administrator for write permissions.",
      });
    }

    const transaction = await sequelize.transaction();

    try {
      console.log("📝 Request body:", req.body);

      if (!req.body) {
        await transaction.rollback();
        return res.status(400).json({ error: "Request body is required" });
      }

      const {
        name,
        target_amount,
        target_date,
        category_id,
        description,
        color,
        icon,
        priority,
        auto_deduct,
        current_amount,
      } = req.body;

      // Validate required fields
      if (!name || !target_amount) {
        await transaction.rollback();
        return res.status(400).json({
          error: "Missing required fields: name, target_amount",
        });
      }

      const user_id = req.user.id;
      const user_type = req.user.type;

      // For regular users, force user_id to their own ID
      // For admins, allow specifying target_user_id
      let target_user_id = user_id;
      if (user_type === 1 && req.body.target_user_id) {
        target_user_id = parseInt(req.body.target_user_id);
      }

      // Verify target user exists
      const user = await User.findByPk(target_user_id);
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ error: "Target user not found" });
      }

      // Verify category exists if provided
      if (category_id) {
        const categoryWhere = { id: parseInt(category_id) };
        if (user_type === 0) {
          categoryWhere.user_id = user_id; // Regular users can only use their own categories
        }

        const category = await Category.findOne({ where: categoryWhere });
        if (!category) {
          await transaction.rollback();
          return res
            .status(404)
            .json({ error: "Category not found or access denied" });
        }
      }

      // Validate target_date if provided
      if (target_date) {
        const targetDateObj = new Date(target_date);
        const currentDate = new Date();
        if (targetDateObj <= currentDate) {
          await transaction.rollback();
          return res
            .status(400)
            .json({ error: "Target date must be in the future" });
        }
      }

      // Check if goal with same name already exists for this user
      const existingGoal = await Goal.findOne({
        where: {
          name: name.trim(),
          user_id: target_user_id,
        },
        transaction,
      });

      if (existingGoal) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ error: "Goal with this name already exists for this user" });
      }

      const goalData = {
        name: name.trim(),
        target_amount: parseFloat(target_amount),
        current_amount: parseFloat(current_amount) || 0,
        target_date: target_date || null,
        category_id: category_id ? parseInt(category_id) : null,
        description: description || null,
        color: color || "#3b82f6",
        icon: icon || null,
        priority: priority || "medium",
        auto_deduct: auto_deduct || false,
        user_id: target_user_id,
      };

      console.log("🎯 Goal data:", goalData);

      const newGoal = await Goal.create(goalData, { transaction });

      await transaction.commit();

      // Reload with associations
      const result = await Goal.findByPk(newGoal.id);

      return res.status(201).json(result);
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating goal:", error);
      return res
        .status(500)
        .json({ error: "Failed to create goal", details: error.message });
    }
  }

  /**
   * Get all goals with RESTful query parameters for filtering
   * GET /api/goals?status=active&priority=high&summary=true
   */
  static async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        priority,
        is_completed,
        category_id,
        user_id,
        status, // active, completed, overdue
        startDate, // filter by target_date
        endDate,
        // RESTful query params for additional functionality
        summary,
        progress,
        search,
      } = req.query;

      // Handle summary request (RESTful: GET /api/goals?summary=true)
      if (summary === "true") {
        return GoalController.handleSummary(req, res);
      }

      // Handle progress request (RESTful: GET /api/goals?progress=true)
      if (progress === "true") {
        return GoalController.handleProgress(req, res);
      }

      // Handle search (RESTful: GET /api/goals?search=vacation)
      if (search) {
        return GoalController.handleSearch(req, res, search, limit);
      }

      // Build base where clause
      let whereConditions = {};

      if (priority) whereConditions.priority = priority;
      if (is_completed !== undefined)
        whereConditions.is_completed = is_completed === "true";
      if (category_id) whereConditions.category_id = parseInt(category_id);

      if (startDate || endDate) {
        whereConditions.target_date = {};
        if (startDate) whereConditions.target_date[Op.gte] = startDate;
        if (endDate) whereConditions.target_date[Op.lte] = endDate;
      }

      // Handle status filtering (RESTful: GET /api/goals?status=overdue)
      if (status) {
        switch (status) {
          case "active":
            whereConditions.is_completed = false;
            break;
          case "completed":
            whereConditions.is_completed = true;
            break;
          case "overdue":
            whereConditions.is_completed = false;
            whereConditions.target_date = { [Op.lt]: new Date() };
            break;
        }
      }

      // Admin can filter by specific user_id
      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = parseInt(user_id);
      }

      const where = GoalController.buildUserFilter(req, whereConditions);

      const { count, rows } = await Goal.findAndCountAll({
        where,
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [
          ["is_completed", "ASC"], // Active goals first
          ["priority", "DESC"], // High priority first
          ["target_date", "ASC"], // Earlier deadlines first
          ["created_at", "DESC"],
        ],
      });

      // Calculate progress for each goal
      const goalsWithProgress = rows.map((goal) => {
        return GoalController.addCalculatedFields(goal);
      });

      return res.json({
        total: count,
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        data: goalsWithProgress,
      });
    } catch (error) {
      console.error("Error fetching goals:", error);
      return res.status(500).json({ error: "Failed to fetch goals" });
    }
  }

  /**
   * Get a single goal by ID
   * GET /api/goals/:id
   */
  static async getById(req, res) {
    try {
      const where = GoalController.buildUserFilter(req, { id: req.params.id });

      const goal = await Goal.findOne({
        where,
      });

      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      // Add calculated fields
      const goalData = GoalController.addCalculatedFields(goal);

      return res.json(goalData);
    } catch (error) {
      console.error("Error fetching goal:", error);
      return res.status(500).json({ error: "Failed to fetch goal" });
    }
  }

  /**
   * Update a goal
   * PUT /api/goals/:id
   */
  static async update(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const where = GoalController.buildUserFilter(req, { id: req.params.id });

      const existingGoal = await Goal.findOne({
        where,
        transaction,
      });

      if (!existingGoal) {
        await transaction.rollback();
        return res.status(404).json({ error: "Goal not found" });
      }

      // Verify category if being updated
      if (req.body.category_id) {
        const categoryWhere = { id: parseInt(req.body.category_id) };
        if (req.user.type === 0) {
          categoryWhere.user_id = req.user.id;
        }

        const category = await Category.findOne({
          where: categoryWhere,
          transaction,
        });
        if (!category) {
          await transaction.rollback();
          return res
            .status(404)
            .json({ error: "Category not found or access denied" });
        }
      }

      // Check if new name conflicts with existing goal for the same user
      if (req.body.name && req.body.name.trim() !== existingGoal.name) {
        const nameConflict = await Goal.findOne({
          where: {
            name: req.body.name.trim(),
            user_id: existingGoal.user_id,
            id: { [Op.ne]: existingGoal.id },
          },
          transaction,
        });

        if (nameConflict) {
          await transaction.rollback();
          return res.status(400).json({
            error: "Goal with this name already exists for this user",
          });
        }
      }

      // Validate target_date if being updated
      if (req.body.target_date) {
        const targetDateObj = new Date(req.body.target_date);
        const currentDate = new Date();
        if (targetDateObj <= currentDate) {
          await transaction.rollback();
          return res
            .status(400)
            .json({ error: "Target date must be in the future" });
        }
      }

      // Prepare update data (exclude sensitive fields)
      const { target_user_id: _, user_id: __, ...updateData } = req.body;

      // Parse numeric fields
      if (updateData.target_amount)
        updateData.target_amount = parseFloat(updateData.target_amount);
      if (updateData.current_amount !== undefined)
        updateData.current_amount = parseFloat(updateData.current_amount);
      if (updateData.category_id)
        updateData.category_id = parseInt(updateData.category_id);
      if (updateData.name) updateData.name = updateData.name.trim();

      // Auto-complete goal if current_amount >= target_amount
      if (
        updateData.current_amount !== undefined &&
        updateData.current_amount >= existingGoal.target_amount
      ) {
        updateData.is_completed = true;
      }

      await existingGoal.update(updateData, { transaction });

      await transaction.commit();

      // Reload with associations
      const result = await Goal.findByPk(existingGoal.id);

      return res.json(result);
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating goal:", error);
      return res.status(500).json({ error: "Failed to update goal" });
    }
  }

  /**
   * Delete a goal
   * DELETE /api/goals/:id
   */
  static async delete(req, res) {
    try {
      const where = GoalController.buildUserFilter(req, { id: req.params.id });

      const goal = await Goal.findOne({ where });

      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      await goal.destroy();
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting goal:", error);
      return res.status(500).json({ error: "Failed to delete goal" });
    }
  }

  /**
   * Add progress to a goal (sub-resource)
   * POST /api/goals/:id/progress
   */
  static async addProgress(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        await transaction.rollback();
        return res.status(400).json({ error: "Valid amount is required" });
      }

      const where = GoalController.buildUserFilter(req, { id: req.params.id });

      const goal = await Goal.findOne({ where, transaction });

      if (!goal) {
        await transaction.rollback();
        return res.status(404).json({ error: "Goal not found" });
      }

      if (goal.is_completed) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ error: "Cannot add progress to completed goal" });
      }

      const newCurrentAmount =
        parseFloat(goal.current_amount) + parseFloat(amount);
      const updateData = { current_amount: newCurrentAmount };

      // Auto-complete if target reached
      if (newCurrentAmount >= goal.target_amount) {
        updateData.is_completed = true;
      }

      await goal.update(updateData, { transaction });

      await transaction.commit();

      // Reload with associations
      const result = await Goal.findByPk(goal.id);

      return res.json({
        goal: result,
        message: updateData.is_completed
          ? "Congratulations! Goal completed!"
          : "Progress added successfully",
        progress_added: parseFloat(amount),
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error adding progress to goal:", error);
      return res.status(500).json({ error: "Failed to add progress to goal" });
    }
  }

  /**
   * Get goal progress history (sub-resource)
   * GET /api/goals/:id/progress
   */
  static async getProgress(req, res) {
    try {
      const where = GoalController.buildUserFilter(req, { id: req.params.id });

      const goal = await Goal.findOne({
        where,
      });

      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      // Add calculated fields
      const goalData = GoalController.addCalculatedFields(goal);

      // Calculate progress milestones
      const milestones = [
        {
          percentage: 25,
          amount: goalData.target_amount * 0.25,
          achieved: goalData.current_amount >= goalData.target_amount * 0.25,
        },
        {
          percentage: 50,
          amount: goalData.target_amount * 0.5,
          achieved: goalData.current_amount >= goalData.target_amount * 0.5,
        },
        {
          percentage: 75,
          amount: goalData.target_amount * 0.75,
          achieved: goalData.current_amount >= goalData.target_amount * 0.75,
        },
        {
          percentage: 100,
          amount: goalData.target_amount,
          achieved: goalData.current_amount >= goalData.target_amount,
        },
      ];

      return res.json({
        goal: goalData,
        milestones,
        next_milestone: milestones.find((m) => !m.achieved) || null,
      });
    } catch (error) {
      console.error("Error fetching goal progress:", error);
      return res.status(500).json({ error: "Failed to fetch goal progress" });
    }
  }

  // ===== HELPER METHODS (PRIVATE) =====

  /**
   * Add calculated fields to goal object
   */
  static addCalculatedFields(goal) {
    const goalData = goal.toJSON();
    goalData.progress_percentage =
      goalData.target_amount > 0
        ? Math.min(
            100,
            Math.round((goalData.current_amount / goalData.target_amount) * 100)
          )
        : 0;
    goalData.remaining_amount = Math.max(
      0,
      goalData.target_amount - goalData.current_amount
    );

    if (goalData.target_date) {
      const targetDate = new Date(goalData.target_date);
      const currentDate = new Date();
      const timeDiff = targetDate.getTime() - currentDate.getTime();
      goalData.days_remaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      goalData.is_overdue =
        goalData.days_remaining < 0 && !goalData.is_completed;

      // Calculate required daily savings
      if (goalData.days_remaining > 0 && !goalData.is_completed) {
        goalData.required_daily_savings =
          goalData.remaining_amount / goalData.days_remaining;
      } else {
        goalData.required_daily_savings = 0;
      }
    } else {
      goalData.days_remaining = null;
      goalData.is_overdue = false;
      goalData.required_daily_savings = 0;
    }

    return goalData;
  }

  /**
   * Handle summary request (RESTful: GET /api/goals?summary=true)
   */
  static async handleSummary(req, res) {
    try {
      const { user_id } = req.query;

      let whereConditions = {};
      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = parseInt(user_id);
      }

      const where = GoalController.buildUserFilter(req, whereConditions);

      // Get overall stats
      const totalGoals = await Goal.count({ where });
      const completedGoals = await Goal.count({
        where: { ...where, is_completed: true },
      });
      const activeGoals = totalGoals - completedGoals;

      // Get overdue goals
      const overdueGoals = await Goal.count({
        where: {
          ...where,
          is_completed: false,
          target_date: { [Op.lt]: new Date() },
        },
      });

      // Get total amounts
      const amountStats = await Goal.findAll({
        where,
        attributes: [
          [sequelize.fn("SUM", sequelize.col("target_amount")), "total_target"],
          [
            sequelize.fn("SUM", sequelize.col("current_amount")),
            "total_current",
          ],
        ],
        raw: true,
      });

      const totalTarget = parseFloat(amountStats[0]?.total_target) || 0;
      const totalCurrent = parseFloat(amountStats[0]?.total_current) || 0;
      const totalRemaining = totalTarget - totalCurrent;
      const overallProgress =
        totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

      // Get goals by priority
      const priorityStats = await Goal.findAll({
        where,
        attributes: [
          "priority",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: ["priority"],
        raw: true,
      });

      return res.json({
        overview: {
          total_goals: totalGoals,
          active_goals: activeGoals,
          completed_goals: completedGoals,
          overdue_goals: overdueGoals,
          completion_rate:
            totalGoals > 0
              ? Math.round((completedGoals / totalGoals) * 100)
              : 0,
        },
        financial: {
          total_target_amount: totalTarget,
          total_current_amount: totalCurrent,
          total_remaining_amount: totalRemaining,
          overall_progress_percentage: overallProgress,
        },
        by_priority: priorityStats,
      });
    } catch (error) {
      console.error("Error fetching goals summary:", error);
      return res.status(500).json({ error: "Failed to fetch goals summary" });
    }
  }

  /**
   * Handle progress request (RESTful: GET /api/goals?progress=true)
   */
  static async handleProgress(req, res) {
    try {
      const { user_id } = req.query;

      let whereConditions = {};
      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = parseInt(user_id);
      }

      const where = GoalController.buildUserFilter(req, whereConditions);

      const goals = await Goal.findAll({
        where,
        order: [["current_amount", "DESC"]],
      });

      const progressData = goals.map((goal) => {
        return GoalController.addCalculatedFields(goal);
      });

      return res.json({ data: progressData });
    } catch (error) {
      console.error("Error fetching goals progress:", error);
      return res.status(500).json({ error: "Failed to fetch goals progress" });
    }
  }

  /**
   * Handle search request (RESTful: GET /api/goals?search=vacation)
   */
  static async handleSearch(req, res, searchTerm, limit) {
    try {
      const where = GoalController.buildUserFilter(req, {
        name: { [Op.iLike]: `%${searchTerm.toLowerCase()}%` },
      });

      const goals = await Goal.findAll({
        where,
        order: [
          [
            sequelize.literal(
              `CASE WHEN LOWER(name) = '${searchTerm.toLowerCase()}' THEN 0 ELSE 1 END`
            ),
          ],
          [sequelize.fn("LENGTH", sequelize.col("name")), "ASC"],
          ["name", "ASC"],
        ],
        limit: Number(limit),
      });

      const goalsWithProgress = goals.map((goal) => {
        return GoalController.addCalculatedFields(goal);
      });

      return res.json({
        data: goalsWithProgress,
        search_term: searchTerm,
      });
    } catch (error) {
      console.error("Error searching goals:", error);
      return res.status(500).json({ error: "Failed to search goals" });
    }
  }
}

module.exports = { GoalController };
