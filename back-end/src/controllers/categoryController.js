const { User } = require("../models/User");
const { Category } = require("../models/Category");
const { Transaction } = require("../models/Transaction");
const { sequelize } = require("../config/sequelize");
const { Op } = require("sequelize");

class CategoryController {
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
   * Create a new category
   */
  static async create(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const categoryData = req.body;
      const user_id = req.user.id;
      const user_type = req.user.type;

      // Validate required fields
      if (!categoryData.name) {
        await transaction.rollback();
        return res.status(400).json({ error: "Category name is required" });
      }

      // For regular users, force user_id to their own ID
      // For admins, allow specifying target_user_id or default to their own
      let target_user_id = user_id;
      if (user_type === 1 && categoryData.target_user_id) {
        target_user_id = parseInt(categoryData.target_user_id);
      }

      // Verify target user exists
      const user = await User.findByPk(target_user_id);
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ error: "Target user not found" });
      }

      // Check if category with same name already exists for this user
      const existingCategory = await Category.findOne({
        where: {
          name: categoryData.name,
          user_id: target_user_id,
        },
        transaction,
      });

      if (existingCategory) {
        await transaction.rollback();
        return res.status(400).json({
          error: "Category with this name already exists for this user",
        });
      }

      // Create the category
      const newCategory = await Category.create(
        {
          name: categoryData.name,
          description: categoryData.description || null,
          color: categoryData.color || "#3B82F6",
          icon: categoryData.icon || "folder",
          user_id: target_user_id,
        },
        { transaction }
      );

      await transaction.commit();

      return res.status(201).json(newCategory);
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating category:", error);
      return res.status(500).json({ error: "Failed to create category" });
    }
  }

  /**
   * Get all categories (RESTful with query parameters for filtering)
   */
  static async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        name,
        color,
        user_id,
        // RESTful query params for additional functionality
        summary,
        with_counts,
        by_type,
      } = req.query;

      // Handle summary request
      if (summary === "true") {
        return CategoryController.getSummary(req, res);
      }

      // Handle with transaction counts
      if (with_counts === "true") {
        return CategoryController.getWithTransactionCounts(req, res);
      }

      // Handle by type (if you have category types in the future)
      if (by_type) {
        return CategoryController.getByType(req, res);
      }

      // Build base where clause
      let whereConditions = {};

      if (name) whereConditions.name = { [Op.iLike]: `%${name}%` };
      if (color) whereConditions.color = color;

      // Admin can filter by specific user_id
      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = parseInt(user_id);
      }

      const where = CategoryController.buildUserFilter(req, whereConditions);

      const { count, rows } = await Category.findAndCountAll({
        where,
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [["name", "ASC"]],
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
        ],
      });

      return res.json({
        total: count,
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        data: rows,
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      return res.status(500).json({ error: "Failed to fetch categories" });
    }
  }

  /**
   * Get a single category by ID
   */
  static async getById(req, res) {
    try {
      const where = CategoryController.buildUserFilter(req, {
        id: req.params.id,
      });

      const category = await Category.findOne({
        where,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
        ],
      });

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      return res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      return res.status(500).json({ error: "Failed to fetch category" });
    }
  }

  /**
   * Update a category
   */
  static async update(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const where = CategoryController.buildUserFilter(req, {
        id: req.params.id,
      });

      const existingCategory = await Category.findOne({
        where,
        transaction,
      });

      if (!existingCategory) {
        await transaction.rollback();
        return res.status(404).json({ error: "Category not found" });
      }

      // Check if new name conflicts with existing category for the same user
      if (req.body.name && req.body.name !== existingCategory.name) {
        const nameConflict = await Category.findOne({
          where: {
            name: req.body.name,
            user_id: existingCategory.user_id,
            id: { [Op.ne]: existingCategory.id },
          },
          transaction,
        });

        if (nameConflict) {
          await transaction.rollback();
          return res.status(400).json({
            error: "Category with this name already exists for this user",
          });
        }
      }

      // Prepare update data (exclude sensitive fields)
      const { target_user_id: _, user_id: __, ...updateData } = req.body;

      // Update category
      await existingCategory.update(updateData, { transaction });

      await transaction.commit();

      // Reload with associations
      const result = await Category.findByPk(existingCategory.id, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
        ],
      });

      return res.json(result);
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating category:", error);
      return res.status(500).json({ error: "Failed to update category" });
    }
  }

  /**
   * Delete a category
   */
  static async delete(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const where = CategoryController.buildUserFilter(req, {
        id: req.params.id,
      });

      const category = await Category.findOne({ where, transaction });

      if (!category) {
        await transaction.rollback();
        return res.status(404).json({ error: "Category not found" });
      }

      // Check if category is being used by any transactions
      const transactionCount = await Transaction.count({
        where: { category_id: category.id },
        transaction,
      });

      if (transactionCount > 0) {
        await transaction.rollback();
        return res.status(400).json({
          error: `Cannot delete category. It is being used by ${transactionCount} transaction(s)`,
        });
      }

      await category.destroy({ transaction });
      await transaction.commit();

      return res.status(204).send();
    } catch (error) {
      await transaction.rollback();
      console.error("Error deleting category:", error);
      return res.status(500).json({ error: "Failed to delete category" });
    }
  }

  /**
   * Get transactions for a specific category
   */
  static async getTransactions(req, res) {
    try {
      const categoryId = req.params.id;
      const { page = 1, limit = 10, user_id } = req.query;

      // Build where clause for category access
      const categoryWhere = CategoryController.buildUserFilter(req, {
        id: categoryId,
      });

      // Verify category exists and user has access
      const category = await Category.findOne({ where: categoryWhere });
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Build where clause for transactions
      let transactionWhere = { category_id: categoryId };

      // Apply user filtering for transactions
      if (req.user.type === 0) {
        transactionWhere.user_id = req.user.id;
      } else if (req.user.type === 1 && user_id) {
        transactionWhere.user_id = parseInt(user_id);
      }

      const { count, rows } = await Transaction.findAndCountAll({
        where: transactionWhere,
        include: ["user", "category", "tags"],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [["date", "DESC"]],
      });

      return res.json({
        category: {
          id: category.id,
          name: category.name,
          color: category.color,
          icon: category.icon,
        },
        total: count,
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        transactions: rows,
      });
    } catch (error) {
      console.error("Error fetching category transactions:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch category transactions" });
    }
  }

  /**
   * Get categories with transaction counts
   */
  static async getWithTransactionCounts(req, res) {
    try {
      const { user_id } = req.query;

      let whereConditions = {};
      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = parseInt(user_id);
      }

      const where = CategoryController.buildUserFilter(req, whereConditions);

      const categories = await Category.findAll({
        where,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
          {
            model: Transaction,
            as: "transactions",
            attributes: [],
            required: false,
          },
        ],
        attributes: [
          "id",
          "name",
          "description",
          "color",
          "icon",
          "created_at",
          "updated_at",
          [
            sequelize.fn("COUNT", sequelize.col("transactions.id")),
            "transaction_count",
          ],
          [
            sequelize.fn("SUM", sequelize.col("transactions.amount")),
            "total_amount",
          ],
        ],
        group: ["Category.id", "user.id"],
        order: [
          [sequelize.literal("transaction_count"), "DESC"],
          ["name", "ASC"],
        ],
      });

      return res.json({ data: categories });
    } catch (error) {
      console.error(
        "Error fetching categories with transaction counts:",
        error
      );
      return res
        .status(500)
        .json({ error: "Failed to fetch categories with transaction counts" });
    }
  }

  /**
   * Get category summary
   */
  static async getSummary(req, res) {
    try {
      const { user_id } = req.query;

      let whereConditions = {};
      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = parseInt(user_id);
      }

      const where = CategoryController.buildUserFilter(req, whereConditions);

      // Get total categories
      const totalCategories = await Category.count({ where });

      // Get categories with transaction stats
      const categoryStats = await Category.findAll({
        where,
        include: [
          {
            model: Transaction,
            as: "transactions",
            attributes: [],
            required: false,
          },
        ],
        attributes: [
          [
            sequelize.fn("COUNT", sequelize.col("transactions.id")),
            "transaction_count",
          ],
          [
            sequelize.fn("SUM", sequelize.col("transactions.amount")),
            "total_amount",
          ],
        ],
        group: ["Category.id"],
        raw: true,
      });

      // Calculate summary stats
      const usedCategories = categoryStats.filter(
        (cat) => parseInt(cat.transaction_count) > 0
      ).length;
      const totalTransactions = categoryStats.reduce(
        (sum, cat) => sum + parseInt(cat.transaction_count || 0),
        0
      );
      const totalAmount = categoryStats.reduce(
        (sum, cat) => sum + parseFloat(cat.total_amount || 0),
        0
      );

      return res.json({
        total_categories: totalCategories,
        used_categories: usedCategories,
        unused_categories: totalCategories - usedCategories,
        total_transactions: totalTransactions,
        total_amount: totalAmount,
      });
    } catch (error) {
      console.error("Error fetching category summary:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch category summary" });
    }
  }

  /**
   * Get categories by type (placeholder for future enhancement)
   */
  static async getByType(req, res) {
    try {
      // This is a placeholder for when you add category types
      // For now, we'll group by first letter of name as an example
      const { user_id } = req.query;

      let whereConditions = {};
      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = parseInt(user_id);
      }

      const where = CategoryController.buildUserFilter(req, whereConditions);

      const categories = await Category.findAll({
        where,
        attributes: [
          [
            sequelize.fn(
              "UPPER",
              sequelize.fn("LEFT", sequelize.col("name"), 1)
            ),
            "type",
          ],
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: [
          sequelize.fn("UPPER", sequelize.fn("LEFT", sequelize.col("name"), 1)),
        ],
        order: [
          [
            sequelize.fn(
              "UPPER",
              sequelize.fn("LEFT", sequelize.col("name"), 1)
            ),
            "ASC",
          ],
        ],
        raw: true,
      });

      return res.json({ data: categories });
    } catch (error) {
      console.error("Error fetching categories by type:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch categories by type" });
    }
  }

  /**
   * Get reports (RESTful reports endpoint)
   */
  static async getReports(req, res) {
    const { type } = req.query;

    try {
      switch (type) {
        case "summary":
          return CategoryController.getSummary(req, res);
        case "by-type":
          return CategoryController.getByType(req, res);
        case "with-counts":
          return CategoryController.getWithTransactionCounts(req, res);
        case "usage":
          return CategoryController.getUsageReport(req, res);
        default:
          return res.status(400).json({
            error:
              "Invalid report type. Available types: summary, by-type, with-counts, usage",
          });
      }
    } catch (error) {
      console.error("Error generating category report:", error);
      return res
        .status(500)
        .json({ error: "Failed to generate category report" });
    }
  }

  /**
   * Get category usage report
   */
  static async getUsageReport(req, res) {
    try {
      const { user_id, startDate, endDate } = req.query;

      let whereConditions = {};
      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = parseInt(user_id);
      }

      let transactionWhere = {};
      if (startDate || endDate) {
        transactionWhere.date = {};
        if (startDate) transactionWhere.date[Op.gte] = startDate;
        if (endDate) transactionWhere.date[Op.lte] = endDate;
      }

      const where = CategoryController.buildUserFilter(req, whereConditions);

      const usageData = await Category.findAll({
        where,
        include: [
          {
            model: Transaction,
            as: "transactions",
            where: transactionWhere,
            attributes: [],
            required: false,
          },
        ],
        attributes: [
          "id",
          "name",
          "color",
          "icon",
          [
            sequelize.fn("COUNT", sequelize.col("transactions.id")),
            "usage_count",
          ],
          [
            sequelize.fn("SUM", sequelize.col("transactions.amount")),
            "total_amount",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal(
                "CASE WHEN transactions.type = 'income' THEN 1 END"
              )
            ),
            "income_transactions",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal(
                "CASE WHEN transactions.type = 'expense' THEN 1 END"
              )
            ),
            "expense_transactions",
          ],
        ],
        group: ["Category.id"],
        order: [[sequelize.literal("usage_count"), "DESC"]],
      });

      return res.json({
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
        data: usageData,
      });
    } catch (error) {
      console.error("Error fetching category usage report:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch category usage report" });
    }
  }
}

module.exports = { CategoryController };
