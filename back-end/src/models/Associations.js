const { User } = require("./User");
const { Category } = require("./Category");
const { Transaction } = require("./Transaction");
const { Tag } = require("./Tag");
const { Goal } = require("./Goal");

// User associations
User.hasMany(Transaction, {
  foreignKey: "user_id",
  as: "transactions",
});

User.hasMany(Category, {
  foreignKey: "user_id",
  as: "categories",
});

User.hasMany(Goal, {
  foreignKey: "user_id",
  as: "goals",
});

// Category associations
Category.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

Category.hasMany(Transaction, {
  foreignKey: "category_id",
  as: "transactions",
});

// Transaction associations
Transaction.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

Transaction.belongsTo(Category, {
  foreignKey: "category_id",
  as: "category",
});

// Goal associations
Goal.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// Many-to-many relationship between Transaction and Tag
Transaction.belongsToMany(Tag, {
  through: "TransactionTags",
  foreignKey: "transaction_id",
  otherKey: "tag_id",
  as: "tags",
});

Tag.belongsToMany(Transaction, {
  through: "TransactionTags",
  foreignKey: "tag_id",
  otherKey: "transaction_id",
  as: "transactions",
});

module.exports = {
  User,
  Category,
  Transaction,
  Tag,
  Goal,
};
