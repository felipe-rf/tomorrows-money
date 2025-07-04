const { Tag } = require("../models/Tag");
const { Transaction } = require("../models/Transaction");
const { User } = require("../models/User");
const { Category } = require("../models/Category");
const { sequelize } = require("../config/sequelize");
const { Op } = require("sequelize");

class TagController {
  /**
   * Helper method to build where clause based on user type
   * Note: Tags are global in this implementation, but can be modified for user-specific tags
   */
  static buildUserFilter(req, additionalWhere = {}) {
    const user_id = req.user.id;
    const user_type = req.user.type;

    let where = { ...additionalWhere };

    // If user type is 0 (regular user), filter by user_id
    // If user type is 1 (admin), no user filter needed
    // If user type is 2 (viewer), filter by viewable_user_id
    if (user_type === 0) {
      where.user_id = user_id;
    } else if (user_type === 2) {
      const viewableUserId = req.user.viewable_user_id || user_id;
      where.user_id = viewableUserId;
    }

    return where;
  }

  /**
   * Create a new tag
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
      const tagData = req.body;
      const user_id = req.user.id;
      const user_type = req.user.type;

      // Validate required fields
      if (!tagData.name) {
        await transaction.rollback();
        return res.status(400).json({ error: "Tag name is required" });
      }

      // For regular users, force user_id to their own ID
      // For admins, allow specifying target_user_id or default to their own
      let target_user_id = user_id;
      if (user_type === 1 && tagData.target_user_id) {
        target_user_id = parseInt(tagData.target_user_id);
      }

      // Check if tag with same name already exists for this user
      const existingTag = await Tag.findOne({
        where: {
          name: tagData.name.toLowerCase(),
          user_id: target_user_id,
        },
        transaction,
      });

      if (existingTag) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ error: "Tag with this name already exists for this user" });
      }

      // Create the tag
      const newTag = await Tag.create(
        {
          name: tagData.name.toLowerCase(),
          color: tagData.color || "#6B7280",
          user_id: target_user_id,
        },
        { transaction }
      );

      await transaction.commit();

      return res.status(201).json(newTag);
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating tag:", error);
      return res.status(500).json({ error: "Failed to create tag" });
    }
  }

  /**
   * Get a single tag by ID
   */
  static async getById(req, res) {
    try {
      const where = TagController.buildUserFilter(req, {
        id: req.params.id,
      });

      const tag = await Tag.findOne({
        where,
      });

      if (!tag) {
        return res.status(404).json({ error: "Tag not found" });
      }

      return res.json(tag);
    } catch (error) {
      console.error("Error fetching tag:", error);
      return res.status(500).json({ error: "Failed to fetch tag" });
    }
  }

  /**
   * Update a tag
   * Regular users can update their own tags, admins can update any tag
   */
  static async update(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const where = TagController.buildUserFilter(req, {
        id: req.params.id,
      });

      const existingTag = await Tag.findOne({
        where,
        transaction,
      });

      if (!existingTag) {
        await transaction.rollback();
        return res.status(404).json({ error: "Tag not found" });
      }

      // Check ownership for regular users
      if (req.user.type === 0 && existingTag.user_id !== req.user.id) {
        await transaction.rollback();
        return res
          .status(403)
          .json({ error: "You can only update your own tags" });
      }

      // Check if new name conflicts with existing tag for this user
      if (req.body.name && req.body.name.toLowerCase() !== existingTag.name) {
        const nameConflict = await Tag.findOne({
          where: {
            name: req.body.name.toLowerCase(),
            user_id: existingTag.user_id, // Check within the same user's tags
            id: { [Op.ne]: existingTag.id },
          },
          transaction,
        });

        if (nameConflict) {
          await transaction.rollback();
          return res
            .status(400)
            .json({ error: "Tag with this name already exists for this user" });
        }
      }

      // Prepare update data
      const updateData = {
        ...(req.body.name && { name: req.body.name.toLowerCase() }),
        ...(req.body.color && { color: req.body.color }),
      };

      // Update tag
      await existingTag.update(updateData, { transaction });

      await transaction.commit();

      return res.json(existingTag);
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating tag:", error);
      return res.status(500).json({ error: "Failed to update tag" });
    }
  }

  /**
   * Delete a tag
   * Regular users can delete their own tags, admins can delete any tag
   */
  static async delete(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const where = TagController.buildUserFilter(req, {
        id: req.params.id,
      });

      const tag = await Tag.findOne({ where, transaction });

      if (!tag) {
        await transaction.rollback();
        return res.status(404).json({ error: "Tag not found" });
      }

      // Check ownership for regular users
      if (req.user.type === 0 && tag.user_id !== req.user.id) {
        await transaction.rollback();
        return res
          .status(403)
          .json({ error: "You can only delete your own tags" });
      }

      // Check if tag is being used by any transactions
      let transactionWhere = {};

      // For regular users, only check their own transactions
      if (req.user.type === 0) {
        transactionWhere.user_id = req.user.id;
      }
      // For admins, check all transactions when deleting any tag
      else if (req.user.type === 1) {
        // If deleting another user's tag, check that user's transactions
        if (tag.user_id !== req.user.id) {
          transactionWhere.user_id = tag.user_id;
        }
      }

      const transactionCount = await Transaction.count({
        where: transactionWhere,
        include: [
          {
            model: Tag,
            as: "tags",
            where: { id: tag.id },
            required: true,
          },
        ],
        transaction,
      });

      if (transactionCount > 0) {
        await transaction.rollback();
        return res.status(400).json({
          error: `Cannot delete tag. It is being used by ${transactionCount} transaction(s)`,
        });
      }

      await tag.destroy({ transaction });
      await transaction.commit();

      return res.status(204).send();
    } catch (error) {
      await transaction.rollback();
      console.error("Error deleting tag:", error);
      return res.status(500).json({ error: "Failed to delete tag" });
    }
  }
  /**
   * RESTful: GET /api/tags with query parameters for filtering
   * ?popular=true&limit=10 - for popular tags
   * ?search=term - for search
   * ?stats=true - for usage stats
   */
  static async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        name,
        color,
        popular, // ?popular=true
        search, // ?search=term
        stats, // ?stats=true
        user_id,
      } = req.query;

      // Handle search
      if (search) {
        return TagController.handleSearch(req, res, search, limit);
      }

      // Handle popular tags
      if (popular === "true") {
        return TagController.handlePopular(req, res, limit, user_id);
      }

      // Handle with stats
      if (stats === "true") {
        return TagController.handleWithStats(req, res, user_id);
      }

      // Regular get all
      let whereConditions = {};
      if (name)
        whereConditions.name = { [Op.iLike]: `%${name.toLowerCase()}%` };
      if (color) whereConditions.color = color;

      const where = TagController.buildUserFilter(req, whereConditions);

      const { count, rows } = await Tag.findAndCountAll({
        where,
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [["name", "ASC"]],
      });

      return res.json({
        total: count,
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        data: rows,
      });
    } catch (error) {
      console.error("Error fetching tags:", error);
      return res.status(500).json({ error: "Failed to fetch tags" });
    }
  }

  /**
   * RESTful: GET /api/tags/:id/stats
   */
  static async getStats(req, res) {
    try {
      const tagId = req.params.id;
      const { user_id } = req.query;

      let transactionWhere = {};

      // Build where clause for transactions based on user permissions
      if (req.user.type === 0) {
        transactionWhere.user_id = req.user.id;
      } else if (req.user.type === 1 && user_id) {
        transactionWhere.user_id = user_id;
      }

      const tag = await Tag.findByPk(tagId, {
        include: [
          {
            model: Transaction,
            as: "transactions",
            where: transactionWhere,
            attributes: ["id", "amount", "type", "date"],
            required: false,
          },
        ],
      });

      if (!tag) {
        return res.status(404).json({ error: "Tag not found" });
      }

      const stats = {
        tag: {
          id: tag.id,
          name: tag.name,
          color: tag.color,
        },
        usage_count: tag.transactions.length,
        total_amount: tag.transactions.reduce(
          (sum, t) => sum + parseFloat(t.amount),
          0
        ),
        income_count: tag.transactions.filter((t) => t.type === "income")
          .length,
        expense_count: tag.transactions.filter((t) => t.type === "expense")
          .length,
        recent_transactions: tag.transactions
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5),
      };

      return res.json(stats);
    } catch (error) {
      console.error("Error fetching tag stats:", error);
      return res.status(500).json({ error: "Failed to fetch tag stats" });
    }
  }

  /**
   * RESTful: GET /api/tags/:id/transactions
   */
  static async getTransactions(req, res) {
    try {
      const tagId = req.params.id;
      const { page = 1, limit = 10, user_id } = req.query;

      let transactionWhere = {};

      // Build where clause based on user permissions
      if (req.user.type === 0) {
        transactionWhere.user_id = req.user.id;
      } else if (req.user.type === 1 && user_id) {
        transactionWhere.user_id = user_id;
      }

      const tag = await Tag.findByPk(tagId);
      if (!tag) {
        return res.status(404).json({ error: "Tag not found" });
      }

      const { count, rows } = await Transaction.findAndCountAll({
        where: transactionWhere,
        include: [
          {
            model: Tag,
            as: "tags",
            where: { id: tagId },
            attributes: ["id", "name", "color"],
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "color"],
          },
        ],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [["date", "DESC"]],
      });

      return res.json({
        tag: {
          id: tag.id,
          name: tag.name,
          color: tag.color,
        },
        total: count,
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        transactions: rows,
      });
    } catch (error) {
      console.error("Error fetching tag transactions:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch tag transactions" });
    }
  }

  // Helper methods (private)
  static async handleSearch(req, res, searchTerm, limit) {
    const whereConditions = {
      name: { [Op.iLike]: `%${searchTerm.toLowerCase()}%` },
    };

    const where = TagController.buildUserFilter(req, whereConditions);

    const tags = await Tag.findAll({
      where,
      order: [
        [
          sequelize.literal(
            `CASE WHEN name = '${searchTerm.toLowerCase()}' THEN 0 ELSE 1 END`
          ),
        ],
        [sequelize.fn("LENGTH", sequelize.col("name")), "ASC"],
        ["name", "ASC"],
      ],
      limit: Number(limit),
    });

    return res.json({ data: tags, search_term: searchTerm });
  }

  static async handlePopular(req, res, limit, user_id) {
    let transactionWhere = {};
    let tagWhere = {};

    // Build where clauses based on user permissions
    if (req.user.type === 0) {
      transactionWhere.user_id = req.user.id;
      tagWhere.user_id = req.user.id;
    } else if (req.user.type === 1 && user_id) {
      transactionWhere.user_id = user_id;
      tagWhere.user_id = user_id;
    } else if (req.user.type === 1) {
      // Admin without specific user_id - no user filter on tags
      // But still need to filter transactions if needed
    } else if (req.user.type === 2) {
      const viewableUserId = req.user.viewable_user_id || req.user.id;
      transactionWhere.user_id = viewableUserId;
      tagWhere.user_id = viewableUserId;
    }

    const popularTags = await Tag.findAll({
      where: tagWhere,
      include: [
        {
          model: Transaction,
          as: "transactions",
          where: transactionWhere,
          attributes: [],
          required: true,
        },
      ],
      attributes: [
        "id",
        "name",
        "color",
        [
          sequelize.fn("COUNT", sequelize.col("transactions.id")),
          "usage_count",
        ],
      ],
      group: ["Tag.id"],
      order: [[sequelize.literal("usage_count"), "DESC"]],
      limit: Number(limit),
    });

    return res.json({ data: popularTags });
  }

  static async handleWithStats(req, res, user_id) {
    let transactionWhere = {};
    let tagWhere = {};

    // Build where clauses based on user permissions
    if (req.user.type === 0) {
      transactionWhere.user_id = req.user.id;
      tagWhere.user_id = req.user.id;
    } else if (req.user.type === 1 && user_id) {
      transactionWhere.user_id = user_id;
      tagWhere.user_id = user_id;
    } else if (req.user.type === 1) {
      // Admin without specific user_id - no user filter needed
    } else if (req.user.type === 2) {
      const viewableUserId = req.user.viewable_user_id || req.user.id;
      transactionWhere.user_id = viewableUserId;
      tagWhere.user_id = viewableUserId;
    }

    const tags = await Tag.findAll({
      where: tagWhere,
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
        "created_at",
        "updated_at",
        [
          sequelize.fn("COUNT", sequelize.col("transactions.id")),
          "usage_count",
        ],
      ],
      group: ["Tag.id"],
      order: [
        [sequelize.literal("usage_count"), "DESC"],
        ["name", "ASC"],
      ],
    });

    return res.json({ data: tags });
  }
}

module.exports = { TagController };
