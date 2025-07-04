const { LogController } = require("../controllers/logController");

/**
 * Middleware to automatically log all API calls
 * This middleware should be placed after authentication middleware
 * to capture user information when available
 */
const logMiddleware = async (req, res, next) => {
  // Skip GET requests and login calls
  if (shouldSkipLogging(req.method, req.path)) {
    return next();
  }

  // Store the original res.json and res.send methods
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;

  // Capture request start time
  const startTime = Date.now();

  // Extract request information
  const requestInfo = {
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    query: req.query,
    body: req.method !== "GET" ? req.body : undefined,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  };

  // Determine action based on HTTP method and path
  const action = determineAction(req.method, req.path);

  // Determine entity type from path
  const entityType = determineEntityType(req.path);

  // Get entity ID if present in params
  const entityId = req.params.id || extractEntityIdFromPath(req.path);

  console.log(
    `📡 API Call: ${req.method} ${req.originalUrl} - User: ${
      req.user?.id || "anonymous"
    }`
  );

  // Override response methods to capture response data
  res.json = function (body) {
    logApiCall(
      req,
      res,
      requestInfo,
      action,
      entityType,
      entityId,
      body,
      startTime
    );
    return originalJson.call(this, body);
  };

  res.send = function (body) {
    logApiCall(
      req,
      res,
      requestInfo,
      action,
      entityType,
      entityId,
      body,
      startTime
    );
    return originalSend.call(this, body);
  };

  res.end = function (chunk, encoding) {
    // Only log if no response has been sent yet (avoid double logging)
    if (!res.headersSent) {
      logApiCall(
        req,
        res,
        requestInfo,
        action,
        entityType,
        entityId,
        null,
        startTime
      );
    }
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Determine the action based on HTTP method and path patterns
 */
function determineAction(method, path) {
  // Handle authentication routes
  if (path.includes("/auth/register")) return "register";
  if (path.includes("/auth/login")) return "login";

  // Handle sub-resources
  if (path.includes("/progress") && method === "POST") return "add_progress";
  if (path.includes("/progress") && method === "GET") return "get_progress";
  if (path.includes("/transactions") && method === "GET")
    return "get_related_transactions";
  if (path.includes("/stats") && method === "GET") return "get_stats";
  if (path.includes("/entity/") && method === "GET") return "get_entity_logs";
  if (path.includes("/reports/")) return "get_report";

  // Handle basic CRUD operations
  switch (method) {
    case "POST":
      return "create";
    case "GET":
      if (path.match(/\/\d+$/)) return "read_one"; // Ends with ID
      return "read_all";
    case "PUT":
      return "update";
    case "DELETE":
      return "delete";
    default:
      return "unknown";
  }
}

/**
 * Determine entity type from the request path
 */
function determineEntityType(path) {
  if (path.includes("/auth/")) return "auth";
  if (path.includes("/users")) return "user";
  if (path.includes("/transactions")) return "transaction";
  if (path.includes("/categories")) return "category";
  if (path.includes("/tags")) return "tag";
  if (path.includes("/goals")) return "goal";
  if (path.includes("/logs")) return "log";
  if (path.includes("/reports/")) return "report";

  return "unknown";
}

/**
 * Extract entity ID from path patterns
 */
function extractEntityIdFromPath(path) {
  // Match patterns like /api/transactions/123 or /api/goals/456/progress
  const matches = path.match(/\/(\w+)\/(\d+)/);
  return matches ? matches[2] : null;
}

/**
 * Log the API call using LogController
 */
async function logApiCall(
  req,
  res,
  requestInfo,
  action,
  entityType,
  entityId,
  responseBody,
  startTime
) {
  try {
    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Prepare log data
    const userId = req.user?.id;
    const statusCode = res.statusCode;

    // Create detailed log entry
    const logData = {
      action: `api_${action}`,
      entity_type: entityType,
      entity_id: entityId,
      old_value: null, // API calls don't have old values
      new_value: {
        request: {
          method: requestInfo.method,
          url: requestInfo.url,
          query:
            Object.keys(requestInfo.query).length > 0
              ? requestInfo.query
              : undefined,
          body:
            requestInfo.body && Object.keys(requestInfo.body).length > 0
              ? sanitizeRequestBody(requestInfo.body)
              : undefined,
          timestamp: requestInfo.timestamp,
        },
        response: {
          status_code: statusCode,
          response_time_ms: responseTime,
          success: statusCode >= 200 && statusCode < 400,
          body: statusCode >= 400 ? responseBody : undefined, // Only log response body for errors
        },
        metadata: {
          ip_address: requestInfo.ip,
          user_agent: requestInfo.userAgent,
          user_id: userId,
          authenticated: !!userId,
        },
      },
    };

    // Use LogController to create the log entry
    if (userId) {
      await LogController.createLogEntry(
        userId,
        logData.action,
        logData.entity_type,
        logData.entity_id,
        logData.old_value,
        logData.new_value,
        req
      );
    } else {
      // For unauthenticated requests, create a system log
      await LogController.createLogEntry(
        "anonymous",
        logData.action,
        logData.entity_type,
        logData.entity_id,
        logData.old_value,
        logData.new_value,
        req
      );
    }

    // Console log for development
    const logLevel = statusCode >= 400 ? "❌" : "✅";
    console.log(
      `${logLevel} ${requestInfo.method} ${
        requestInfo.url
      } - ${statusCode} (${responseTime}ms) - User: ${userId || "anonymous"}`
    );
  } catch (error) {
    console.error("Error in logging middleware:", error);
    // Don't throw error to avoid breaking the API response
  }
}

/**
 * Determine if logging should be skipped for this endpoint
 */
function shouldSkipLogging(method, path) {
  // Skip all GET requests
  if (method === "GET") {
    return true;
  }

  // Skip login calls
  if (path.includes("/auth/login")) {
    return true;
  }

  // Skip other paths to avoid infinite loops or unnecessary logging
  const skipPaths = [
    "/api/logs", // Avoid infinite loops when logging logs
    "/health", // Health check endpoints
    "/status", // Status endpoints
    "/favicon.ico", // Browser requests
  ];

  return skipPaths.some((skipPath) => path.includes(skipPath));
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== "object") return body;

  const sensitiveFields = ["password", "token", "secret", "key", "auth"];
  const sanitized = { ...body };

  // Recursively sanitize object
  function sanitizeObject(obj) {
    if (!obj || typeof obj !== "object") return obj;

    const result = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowercaseKey = key.toLowerCase();

      if (sensitiveFields.some((field) => lowercaseKey.includes(field))) {
        result[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  return sanitizeObject(sanitized);
}

module.exports = { logMiddleware };
