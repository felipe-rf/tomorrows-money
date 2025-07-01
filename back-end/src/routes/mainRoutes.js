const { Router } = require("express");
const { register, login } = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");
const { logMiddleware } = require("../middlewares/logMiddleware");
const {
  checkWritePermissions,
} = require("../middlewares/permissionsMiddleware");
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
router.post(
  "/users",
  authenticate,
  checkWritePermissions,
  UserController.create
);
router.get("/users", authenticate, UserController.getAll);
router.get("/users/:id", authenticate, UserController.getById);
router.put(
  "/users/:id",
  authenticate,
  checkWritePermissions,
  UserController.update
);
router.delete(
  "/users/:id",
  authenticate,
  checkWritePermissions,
  UserController.delete
);

// Sub-resources and actions
router.post(
  "/users/:id/deactivate",
  authenticate,
  checkWritePermissions,
  UserController.deactivate
);
router.post(
  "/users/:id/activate",
  authenticate,
  checkWritePermissions,
  UserController.activate
);
router.get("/users/:id/stats", authenticate, UserController.getStats);

// ===== TRANSACTION ROUTES =====
// Basic CRUD
router.post(
  "/transactions",
  authenticate,
  checkWritePermissions,
  TransactionController.create
);
router.get("/transactions", authenticate, TransactionController.getAll);
router.get("/transactions/:id", authenticate, TransactionController.getById);
router.put(
  "/transactions/:id",
  authenticate,
  checkWritePermissions,
  TransactionController.update
);
router.delete(
  "/transactions/:id",
  authenticate,
  checkWritePermissions,
  TransactionController.delete
);

// ===== CATEGORY ROUTES =====
// Basic CRUD
router.post(
  "/categories",
  authenticate,
  checkWritePermissions,
  CategoryController.create
);
router.get("/categories", authenticate, CategoryController.getAll);
router.get("/categories/:id", authenticate, CategoryController.getById);
router.put(
  "/categories/:id",
  authenticate,
  checkWritePermissions,
  CategoryController.update
);
router.delete(
  "/categories/:id",
  authenticate,
  checkWritePermissions,
  CategoryController.delete
);

// Sub-resource: category transactions
router.get(
  "/categories/:id/transactions",
  authenticate,
  CategoryController.getTransactions
);

// ===== TAG ROUTES =====
// Basic CRUD
router.post("/tags", authenticate, checkWritePermissions, TagController.create);
router.get("/tags", authenticate, TagController.getAll);
router.get("/tags/:id", authenticate, TagController.getById);
router.put(
  "/tags/:id",
  authenticate,
  checkWritePermissions,
  TagController.update
);
router.delete(
  "/tags/:id",
  authenticate,
  checkWritePermissions,
  TagController.delete
);

// Sub-resource: tag transactions and stats
router.get(
  "/tags/:id/transactions",
  authenticate,
  TagController.getTransactions
);
router.get("/tags/:id/stats", authenticate, TagController.getStats);

// ===== GOAL ROUTES =====
// Basic CRUD
router.post(
  "/goals",
  authenticate,
  checkWritePermissions,
  GoalController.create
);
router.get("/goals", authenticate, GoalController.getAll);
router.get("/goals/:id", authenticate, GoalController.getById);
router.put(
  "/goals/:id",
  authenticate,
  checkWritePermissions,
  GoalController.update
);
router.delete(
  "/goals/:id",
  authenticate,
  checkWritePermissions,
  GoalController.delete
);

// Sub-resource: goal progress
router.post(
  "/goals/:id/progress",
  authenticate,
  checkWritePermissions,
  GoalController.addProgress
);
router.get("/goals/:id/progress", authenticate, GoalController.getProgress);

// ===== LOG ROUTES =====
// Basic CRUD
router.post("/logs", authenticate, checkWritePermissions, LogController.create);
router.get("/logs", authenticate, LogController.getAll);
router.get("/logs/:id", authenticate, LogController.getById);
router.put(
  "/logs/:id",
  authenticate,
  checkWritePermissions,
  LogController.update
);
router.delete(
  "/logs/:id",
  authenticate,
  checkWritePermissions,
  LogController.delete
);

// Sub-resource: entity logs
router.get("/logs/entity/:type/:id", authenticate, LogController.getByEntity);

module.exports = router;
