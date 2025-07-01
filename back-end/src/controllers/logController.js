const { Log } = require("../models/Log");
const { User } = require("../models/User");
const { Op } = require("sequelize");

class LogController {
  /**
   * Helper method to build where clause based on user type
   */
  static buildUserFilter(req, additionalWhere = {}) {
    console.log("🔍 User info:", req.user);
    const user_id = req.user.id;
    const user_type = req.user.type;

    let where = { ...additionalWhere };

    // If user type is 0 (regular user), filter by user_id
    // If user type is 1 (admin), no user filter needed unless specified
    if (user_type === 0) {
      where.user_id = user_id.toString();
    }

    console.log("🔍 Built where clause:", where);
    return where;
  }

  /**
   * Create a new log entry
   * POST /api/logs
   * Note: Usually logs are created automatically by middleware, not manually
   */
  static async create(req, res) {
    try {
      console.log("📝 Request body:", req.body);

      if (!req.body) {
        return res.status(400).json({ error: "Request body is required" });
      }

      const { action, entity_type, entity_id, old_value, new_value } = req.body;

      // Validate required fields
      if (!action || !entity_type) {
        return res.status(400).json({
          error: "Missing required fields: action, entity_type",
        });
      }

      const user_id = req.user.id;
      const user_type = req.user.type;

      // For regular users, force user_id to their own ID
      // For admins, allow specifying target_user_id for system logs
      let target_user_id = user_id;
      if (user_type === 1 && req.body.target_user_id) {
        target_user_id = req.body.target_user_id;
      }

      // Generate unique log ID
      const log_id = `log_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const logData = {
        log_id,
        user_id: target_user_id.toString(),
        action: action.trim(),
        entity_type: entity_type.trim(),
        entity_id: entity_id || null,
        old_value: old_value || null,
        new_value: new_value || null,
        ip_address: req.ip || req.connection.remoteAddress || null,
        user_agent: req.get("User-Agent") || null,
      };

      console.log("📊 Log data:", logData);

      const newLog = await Log.create(logData);

      return res.status(201).json(newLog);
    } catch (error) {
      console.error("Error creating log:", error);
      return res
        .status(500)
        .json({ error: "Failed to create log", details: error.message });
    }
  }

  /**
   * Get all logs with RESTful query parameters for filtering
   * GET /api/logs?action=create&entity_type=transaction&summary=true
   */
  static async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        action,
        entity_type,
        entity_id,
        user_id,
        startDate,
        endDate,
        ip_address,
        // RESTful query params for additional functionality
        summary,
        activity,
        search,
      } = req.query;

      // Handle summary request (RESTful: GET /api/logs?summary=true)
      if (summary === "true") {
        return LogController.handleSummary(req, res);
      }

      // Handle activity request (RESTful: GET /api/logs?activity=true)
      if (activity === "true") {
        return LogController.handleActivity(req, res);
      }

      // Handle search (RESTful: GET /api/logs?search=transaction)
      if (search) {
        return LogController.handleSearch(req, res, search, limit);
      }

      // Build base where clause
      let whereConditions = {};

      if (action) whereConditions.action = action;
      if (entity_type) whereConditions.entity_type = entity_type;
      if (entity_id) whereConditions.entity_id = entity_id;
      if (ip_address) whereConditions.ip_address = ip_address;

      if (startDate || endDate) {
        whereConditions.created_at = {};
        if (startDate) whereConditions.created_at.$gte = new Date(startDate);
        if (endDate) whereConditions.created_at.$lte = new Date(endDate);
      }

      // Admin can filter by specific user_id
      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = user_id.toString();
      }

      const where = LogController.buildUserFilter(req, whereConditions);

      // Calculate pagination
      const skip = (Number(page) - 1) * Number(limit);

      // Get logs with pagination
      const logs = await Log.find(where)
        .sort({ created_at: -1 }) // Most recent first
        .skip(skip)
        .limit(Number(limit))
        .lean();

      // Get total count
      const total = await Log.countDocuments(where);

      // Enhance logs with user information if needed
      const enhancedLogs = await Promise.all(
        logs.map(async (log) => {
          // Only fetch user info for admins or if it's the user's own log
          if (req.user.type === 1 || log.user_id === req.user.id.toString()) {
            try {
              const user = await User.findByPk(parseInt(log.user_id));
              return {
                ...log,
                user: user
                  ? { id: user.id, name: user.name, email: user.email }
                  : null,
              };
            } catch (error) {
              console.warn("Could not fetch user for log:", log.log_id);
              return log;
            }
          }
          return log;
        })
      );

      return res.json({
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        data: enhancedLogs,
      });
    } catch (error) {
      console.error("Error fetching logs:", error);
      return res.status(500).json({ error: "Failed to fetch logs" });
    }
  }

  /**
   * Get a single log by ID
   * GET /api/logs/:id
   */
  static async getById(req, res) {
    try {
      const logId = req.params.id;

      const log = await Log.findOne({ log_id: logId }).lean();

      if (!log) {
        return res.status(404).json({ error: "Log not found" });
      }

      // Check access permissions
      if (req.user.type === 0 && log.user_id !== req.user.id.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Enhance with user information
      try {
        const user = await User.findByPk(parseInt(log.user_id));
        log.user = user
          ? { id: user.id, name: user.name, email: user.email }
          : null;
      } catch (error) {
        console.warn("Could not fetch user for log:", log.log_id);
      }

      return res.json(log);
    } catch (error) {
      console.error("Error fetching log:", error);
      return res.status(500).json({ error: "Failed to fetch log" });
    }
  }

  /**
   * Update a log (usually not allowed, but included for completeness)
   * PUT /api/logs/:id
   */
  static async update(req, res) {
    try {
      // Logs are typically immutable for audit purposes
      return res.status(405).json({
        error: "Method not allowed. Logs are immutable for audit purposes.",
      });
    } catch (error) {
      console.error("Error updating log:", error);
      return res.status(500).json({ error: "Failed to update log" });
    }
  }

  /**
   * Delete a log (usually only allowed for admins and with restrictions)
   * DELETE /api/logs/:id
   */
  static async delete(req, res) {
    try {
      const logId = req.params.id;

      // Only admins can delete logs
      if (req.user.type !== 1) {
        return res
          .status(403)
          .json({ error: "Only administrators can delete logs" });
      }

      const log = await Log.findOne({ log_id: logId });

      if (!log) {
        return res.status(404).json({ error: "Log not found" });
      }

      await Log.deleteOne({ log_id: logId });

      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting log:", error);
      return res.status(500).json({ error: "Failed to delete log" });
    }
  }

  /**
   * Get logs for a specific entity (sub-resource)
   * GET /api/logs/entity/:type/:id
   */
  static async getByEntity(req, res) {
    try {
      const { type, id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      let whereConditions = {
        entity_type: type,
        entity_id: id,
      };

      const where = LogController.buildUserFilter(req, whereConditions);

      const skip = (Number(page) - 1) * Number(limit);

      const logs = await Log.find(where)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

      const total = await Log.countDocuments(where);

      // Enhance with user information
      const enhancedLogs = await Promise.all(
        logs.map(async (log) => {
          if (req.user.type === 1 || log.user_id === req.user.id.toString()) {
            try {
              const user = await User.findByPk(parseInt(log.user_id));
              return {
                ...log,
                user: user
                  ? { id: user.id, name: user.name, email: user.email }
                  : null,
              };
            } catch (error) {
              return log;
            }
          }
          return log;
        })
      );

      return res.json({
        entity: { type, id },
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        data: enhancedLogs,
      });
    } catch (error) {
      console.error("Error fetching entity logs:", error);
      return res.status(500).json({ error: "Failed to fetch entity logs" });
    }
  }

  // ===== HELPER METHODS (PRIVATE) =====

  /**
   * Handle summary request (RESTful: GET /api/logs?summary=true)
   */
  static async handleSummary(req, res) {
    try {
      const { user_id, startDate, endDate } = req.query;

      let whereConditions = {};

      if (startDate || endDate) {
        whereConditions.created_at = {};
        if (startDate) whereConditions.created_at.$gte = new Date(startDate);
        if (endDate) whereConditions.created_at.$lte = new Date(endDate);
      }

      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = user_id.toString();
      }

      const where = LogController.buildUserFilter(req, whereConditions);

      // Get total logs
      const totalLogs = await Log.countDocuments(where);

      // Get logs by action
      const actionStats = await Log.aggregate([
        { $match: where },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Get logs by entity type
      const entityStats = await Log.aggregate([
        { $match: where },
        { $group: { _id: "$entity_type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Get recent activity (last 24 hours)
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const recentActivity = await Log.countDocuments({
        ...where,
        created_at: { $gte: last24Hours },
      });

      return res.json({
        overview: {
          total_logs: totalLogs,
          recent_activity_24h: recentActivity,
        },
        by_action: actionStats,
        by_entity_type: entityStats,
        period: {
          start_date: startDate || null,
          end_date: endDate || null,
        },
      });
    } catch (error) {
      console.error("Error fetching logs summary:", error);
      return res.status(500).json({ error: "Failed to fetch logs summary" });
    }
  }

  /**
   * Handle activity request (RESTful: GET /api/logs?activity=true)
   */
  static async handleActivity(req, res) {
    try {
      const { user_id, hours = 24 } = req.query;

      const timeRange = new Date();
      timeRange.setHours(timeRange.getHours() - parseInt(hours));

      let whereConditions = {
        created_at: { $gte: timeRange },
      };

      if (req.user.type === 1 && user_id) {
        whereConditions.user_id = user_id.toString();
      }

      const where = LogController.buildUserFilter(req, whereConditions);

      // Get hourly activity
      const hourlyActivity = await Log.aggregate([
        { $match: where },
        {
          $group: {
            _id: {
              hour: { $hour: "$created_at" },
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$created_at" },
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1, "_id.hour": 1 } },
      ]);

      // Get recent logs
      const recentLogs = await Log.find(where)
        .sort({ created_at: -1 })
        .limit(10)
        .lean();

      return res.json({
        period: {
          hours_back: parseInt(hours),
          from: timeRange.toISOString(),
          to: new Date().toISOString(),
        },
        hourly_activity: hourlyActivity,
        recent_logs: recentLogs,
      });
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      return res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  }

  /**
   * Handle search request (RESTful: GET /api/logs?search=transaction)
   */
  static async handleSearch(req, res, searchTerm, limit) {
    try {
      const where = LogController.buildUserFilter(req, {
        $or: [
          { action: { $regex: searchTerm, $options: "i" } },
          { entity_type: { $regex: searchTerm, $options: "i" } },
          { entity_id: { $regex: searchTerm, $options: "i" } },
        ],
      });

      const logs = await Log.find(where)
        .sort({ created_at: -1 })
        .limit(Number(limit))
        .lean();

      return res.json({
        data: logs,
        search_term: searchTerm,
      });
    } catch (error) {
      console.error("Error searching logs:", error);
      return res.status(500).json({ error: "Failed to search logs" });
    }
  }

  /**
   * Static method to create log entries (for use by other controllers)
   */
  static async createLogEntry(
    userId,
    action,
    entityType,
    entityId = null,
    oldValue = null,
    newValue = null,
    req = null
  ) {
    try {
      const log_id = `log_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const logData = {
        log_id,
        user_id: userId.toString(),
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldValue,
        new_value: newValue,
        ip_address: req ? req.ip || req.connection.remoteAddress : null,
        user_agent: req ? req.get("User-Agent") : null,
      };

      await Log.create(logData);
      console.log(
        `📊 Log created: ${action} on ${entityType} by user ${userId}`
      );
    } catch (error) {
      console.error("Error creating log entry:", error);
      // Don't throw error to avoid breaking the main operation
    }
  }
}

module.exports = { LogController };
