const { Transaction } = require("../models/Transaction");
const { User } = require("../models/User");
const { Category } = require("../models/Category");
const { Tag } = require("../models/Tag");
const { sequelize } = require("../config/sequelize");
const { Op } = require("sequelize");

class TransactionController {
  /**
   * Helper method to build where clause based on user type
   */
  static buildUserFilter(req, additionalWhere = {}) {
    const user_id = req.user.id;
    const user_type = req.user.type;

    let where = { ...additionalWhere };

    // If user type is 0 (regular user), filter by user_id
    // If user type is 1 (admin), no user filter needed
    if (user_type === 0) {
      where.user_id = user_id;
    }

    return where;
  }

  /**
   * Create a new transaction
   */
  static async create(req, res) {
    const transaction = await sequelize.transaction();

    try {
      console.log("📝 Request body:", req.body);

      if (!req.body) {
        await transaction.rollback();
        return res.status(400).json({ error: "Request body is required" });
      }

      const { amount, type, description, category_id, date, is_paid } =
        req.body;

      if (!amount || !type || !description || !category_id) {
        await transaction.rollback();
        return res.status(400).json({
          error:
            "Missing required fields: amount, type, description, category_id",
        });
      }

      const user_id = req.user.id;
      const user_type = req.user.type;

      const transactionData = {
        amount: parseFloat(amount),
        type,
        description,
        category_id: parseInt(category_id),
        date: date || new Date().toISOString().split("T")[0],
        is_paid: is_paid || false,
      };

      console.log("📊 Transaction data:", transactionData);

      let target_user_id = user_id;
      if (user_type === 1 && req.body.target_user_id) {
        target_user_id = parseInt(req.body.target_user_id);
      }

      const user = await User.findByPk(target_user_id);
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ error: "Target user not found" });
      }

      const categoryWhere = { id: transactionData.category_id };
      if (user_type === 0) {
        categoryWhere.user_id = user_id;
      }

      const category = await Category.findOne({ where: categoryWhere });
      if (!category) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ error: "Category not found or access denied" });
      }

      const newTransaction = await Transaction.create(
        { ...transactionData, user_id: target_user_id },
        { transaction }
      );

      // Handle tag associations if provided
      if (req.body.tags && Array.isArray(req.body.tags)) {
        console.log("🏷️  Setting tags:", req.body.tags);
        console.log(
          "🏷️  User type:",
          user_type,
          "User ID:",
          user_id,
          "Target user ID:",
          target_user_id
        );

        const tagIds = req.body.tags.map((id) => parseInt(id));

        // Build tag where clause based on user permissions
        let tagWhere = { id: { [Op.in]: tagIds } };
        if (user_type === 0) {
          // Regular users can only use their own tags
          tagWhere.user_id = user_id;
        } else if (user_type === 1) {
          // Admins can use tags from the target user
          tagWhere.user_id = target_user_id;
        }

        console.log("🏷️  Tag where clause:", tagWhere);

        // First, let's see all tags for this user to debug
        const allUserTags = await Tag.findAll({
          where: { user_id: tagWhere.user_id },
          transaction,
        });
        console.log(
          "🏷️  All tags for user:",
          allUserTags.map((t) => ({
            id: t.id,
            name: t.name,
            user_id: t.user_id,
          }))
        );

        const tags = await Tag.findAll({
          where: tagWhere,
          transaction,
        });

        console.log(
          "🏷️  Found tags:",
          tags.map((t) => ({ id: t.id, name: t.name, user_id: t.user_id }))
        );

        if (tags.length === 0 && tagIds.length > 0) {
          console.log("⚠️  No tags found matching criteria");
        }
        await newTransaction.setTags(tags, { transaction });
        console.log("🏷️  Tags set on transaction, count:", tags.length);
      }

      await transaction.commit();

      const result = await Transaction.findByPk(newTransaction.id, {
        include: ["user", "category", "tags"],
      });

      return res.status(201).json(result);
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating transaction:", error);
      return res.status(500).json({
        error: "Failed to create transaction",
        details: error.message,
      });
    }
  }

  /**
   * Get all transactions (RESTful with query parameters for filtering)
   */
  static async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        category_id,
        startDate,
        endDate,
        is_paid,
        user_id,
        // RESTful query params for additional functionality
        summary,
        by_category,
        tags,
      } = req.query;

      // Handle summary request
      if (summary === "true") {
        return TransactionController.getSummary(req, res);
      }

      // Handle by-category request
      if (by_category === "true") {
        return TransactionController.getByCategory(req, res);
      }

      // Build base where clause
      let whereConditions = {};

      if (type) whereConditions.type = type;
      if (category_id) whereConditions.category_id = parseInt(category_id);
      if (is_paid) whereConditions.is_paid = is_paid === "true";

      if (startDate || endDate) {
        whereConditions.date = {};
        if (startDate) whereConditions.date[Op.gte] = startDate;
        if (endDate) whereConditions.date[Op.lte] = endDate;
      }

      // Admin can filter by specific user_id, regular users are restricted to their own
      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = parseInt(user_id);
      }

      const where = TransactionController.buildUserFilter(req, whereConditions);

      // Build include array
      let include = ["user", "category", "tags"];

      // If filtering by tags
      if (tags) {
        const tagIds = tags.split(",").map((id) => parseInt(id));
        include = [
          "user",
          "category",
          {
            model: Tag,
            as: "tags",
            where: { id: { [Op.in]: tagIds } },
          },
        ];
      }

      const { count, rows } = await Transaction.findAndCountAll({
        where,
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [
          ["date", "DESC"],
          ["created_at", "DESC"],
        ],
        include,
        distinct: true, // Important when using includes with associations
      });

      return res.json({
        total: count,
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        data: rows,
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return res.status(500).json({ error: "Failed to fetch transactions" });
    }
  }

  /**
   * Get a single transaction by ID
   */
  static async getById(req, res) {
    try {
      const where = TransactionController.buildUserFilter(req, {
        id: req.params.id,
      });

      const transaction = await Transaction.findOne({
        where,
        include: ["user", "category", "tags"],
      });

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      return res.json(transaction);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      return res.status(500).json({ error: "Failed to fetch transaction" });
    }
  }

  /**
   * Update a transaction
   */
  static async update(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const where = TransactionController.buildUserFilter(req, {
        id: req.params.id,
      });

      const existingTransaction = await Transaction.findOne({
        where,
        transaction,
      });

      if (!existingTransaction) {
        await transaction.rollback();
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (req.body.category_id) {
        const categoryWhere = { id: req.body.category_id };
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

      const { user_id: _, target_user_id: __, tags, ...updateData } = req.body;

      // Parse numeric fields
      if (updateData.amount) updateData.amount = parseFloat(updateData.amount);
      if (updateData.category_id)
        updateData.category_id = parseInt(updateData.category_id);

      await existingTransaction.update(updateData, { transaction });

      // Handle tag associations if provided
      if (tags && Array.isArray(tags)) {
        console.log("🏷️  Updating tags:", tags);
        const tagIdNumbers = tags.map((id) => parseInt(id));

        // Build tag where clause based on user permissions
        let tagWhere = { id: { [Op.in]: tagIdNumbers } };
        if (req.user.type === 0) {
          // Regular users can only use their own tags
          tagWhere.user_id = req.user.id;
        } else if (req.user.type === 1) {
          // Admins can use tags from the transaction owner
          tagWhere.user_id = existingTransaction.user_id;
        }
        const tagObjects = await Tag.findAll({
          where: tagWhere,
          transaction,
        });

        console.log(
          "🏷️  Found tags for update:",
          tagObjects.map((t) => ({ id: t.id, name: t.name }))
        );
        await existingTransaction.setTags(tagObjects, { transaction });
      }

      await transaction.commit();

      const result = await Transaction.findByPk(existingTransaction.id, {
        include: ["user", "category", "tags"],
      });

      return res.json(result);
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating transaction:", error);
      return res.status(500).json({ error: "Failed to update transaction" });
    }
  }

  /**
   * Delete a transaction
   */
  static async delete(req, res) {
    try {
      const where = TransactionController.buildUserFilter(req, {
        id: req.params.id,
      });

      const transaction = await Transaction.findOne({ where });

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      await transaction.destroy();
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      return res.status(500).json({ error: "Failed to delete transaction" });
    }
  }

  /**
   * Get transactions summary (totals by type)
   */
  static async getSummary(req, res) {
    try {
      const { startDate, endDate, user_id } = req.query;

      let whereConditions = {};

      if (startDate || endDate) {
        whereConditions.date = {};
        if (startDate) whereConditions.date[Op.gte] = startDate;
        if (endDate) whereConditions.date[Op.lte] = endDate;
      }

      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = parseInt(user_id);
      }

      const where = TransactionController.buildUserFilter(req, whereConditions);

      const results = await Transaction.findAll({
        where,
        attributes: [
          "type",
          [sequelize.fn("SUM", sequelize.col("amount")), "total"],
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: ["type"],
        raw: true,
      });

      const summary = {
        income: { total: 0, count: 0 },
        expense: { total: 0, count: 0 },
        balance: 0,
      };

      results.forEach((row) => {
        if (row.type === "income") {
          summary.income.total = parseFloat(row.total) || 0;
          summary.income.count = parseInt(row.count) || 0;
        } else if (row.type === "expense") {
          summary.expense.total = parseFloat(row.total) || 0;
          summary.expense.count = parseInt(row.count) || 0;
        }
      });

      summary.balance = summary.income.total - summary.expense.total;

      return res.json(summary);
    } catch (error) {
      console.error("Error fetching transaction summary:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch transaction summary" });
    }
  }

  /**
   * Get transactions by category
   */
  static async getByCategory(req, res) {
    try {
      const { startDate, endDate, type, user_id } = req.query;

      let whereConditions = {};
      if (type) whereConditions.type = type;

      if (startDate || endDate) {
        whereConditions.date = {};
        if (startDate) whereConditions.date[Op.gte] = startDate;
        if (endDate) whereConditions.date[Op.lte] = endDate;
      }

      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = parseInt(user_id);
      }

      const where = TransactionController.buildUserFilter(req, whereConditions);

      const transactions = await Transaction.findAll({
        where,
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "color", "icon"],
          },
        ],
        attributes: [
          "category_id",
          [sequelize.fn("SUM", sequelize.col("amount")), "total"],
          [sequelize.fn("COUNT", sequelize.col("Transaction.id")), "count"],
        ],
        group: [
          "category_id",
          "category.id",
          "category.name",
          "category.color",
          "category.icon",
        ],
        order: [[sequelize.literal("total"), "DESC"]],
      });

      return res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions by category:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch transactions by category" });
    }
  }
}

module.exports = { TransactionController };
