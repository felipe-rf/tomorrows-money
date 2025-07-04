const { Router } = require("express");
const { register, login } = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");
const { logMiddleware } = require("../middlewares/logMiddleware");
const {
  TransactionController,
} = require("../controllers/transactionController");
const { CategoryController } = require("../controllers/categoryController");
const { TagController } = require("../controllers/tagController");
const { GoalController } = require("../controllers/goalController");
const { LogController } = require("../controllers/logController");
const { UserController } = require("../controllers/userController");

const router = Router();

// ===== GLOBAL MIDDLEWARE =====
router.use(logMiddleware);

// ===== AUTHENTICATION ROUTES =====
router.post("/auth/register", register);
router.post("/auth/login", login);

// ===== USER ROUTES =====
// Basic CRUD
router.post("/users", authenticate, UserController.create);
router.get("/users", authenticate, UserController.getAll);
router.get("/users/:id", authenticate, UserController.getById);
router.put("/users/:id", authenticate, UserController.update);

// Self-deletion route (before /:id route to match /me first)
router.delete("/users/me", authenticate, UserController.deleteSelf);

// Regular deletion route
router.delete("/users/:id", authenticate, UserController.delete);

// Sub-resources and actions
router.get("/users/:id/stats", authenticate, UserController.getStats);

// ===== TRANSACTION ROUTES =====
// Basic CRUD
router.post("/transactions", authenticate, TransactionController.create);
router.get("/transactions", authenticate, TransactionController.getAll);
router.get("/transactions/:id", authenticate, TransactionController.getById);
router.put("/transactions/:id", authenticate, TransactionController.update);
router.delete("/transactions/:id", authenticate, TransactionController.delete);

// ===== CATEGORY ROUTES =====
// Basic CRUD
router.post("/categories", authenticate, CategoryController.create);
router.get("/categories", authenticate, CategoryController.getAll);
router.get("/categories/:id", authenticate, CategoryController.getById);
router.put("/categories/:id", authenticate, CategoryController.update);
router.delete("/categories/:id", authenticate, CategoryController.delete);

// Sub-resource: category transactions
router.get(
  "/categories/:id/transactions",
  authenticate,
  CategoryController.getTransactions
);

// ===== TAG ROUTES =====
// Basic CRUD
router.post("/tags", authenticate, TagController.create);
router.get("/tags", authenticate, TagController.getAll);
router.get("/tags/:id", authenticate, TagController.getById);
router.put("/tags/:id", authenticate, TagController.update);
router.delete("/tags/:id", authenticate, TagController.delete);

// Sub-resource: tag transactions and stats
router.get(
  "/tags/:id/transactions",
  authenticate,
  TagController.getTransactions
);
router.get("/tags/:id/stats", authenticate, TagController.getStats);

// ===== GOAL ROUTES =====
// Basic CRUD
router.post("/goals", authenticate, GoalController.create);
router.get("/goals", authenticate, GoalController.getAll);
router.get("/goals/:id", authenticate, GoalController.getById);
router.put("/goals/:id", authenticate, GoalController.update);
router.delete("/goals/:id", authenticate, GoalController.delete);

// Sub-resource: goal progress
router.post("/goals/:id/progress", authenticate, GoalController.addProgress);
router.get("/goals/:id/progress", authenticate, GoalController.getProgress);

// ===== LOG ROUTES =====
// Basic CRUD
router.post("/logs", authenticate, LogController.create);
router.get("/logs", authenticate, LogController.getAll);
router.get("/logs/:id", authenticate, LogController.getById);
router.put("/logs/:id", authenticate, LogController.update);
router.delete("/logs/:id", authenticate, LogController.delete);

// Sub-resource: entity logs
router.get("/logs/entity/:type/:id", authenticate, LogController.getByEntity);

module.exports = router;
