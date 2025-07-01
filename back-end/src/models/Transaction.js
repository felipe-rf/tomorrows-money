const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/sequelize");
const { User } = require("./User");
const { Category } = require("./Category");

class Transaction extends Model {}

Transaction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      onDelete: "CASCADE",
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      onDelete: "RESTRICT", // Prevent delete if transactions exist
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: 0.01,
      },
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    type: {
      type: DataTypes.ENUM("income", "expense"),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM(
        "cash",
        "credit_card",
        "debit_card",
        "transfer",
        "pix",
        "other"
      ),
      allowNull: false,
      defaultValue: "other",
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    recurrence_frequency: {
      type: DataTypes.ENUM("daily", "weekly", "monthly", "yearly"),
      allowNull: true,
    },
    recurrence_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    installment_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    total_installments: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    is_paid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Transaction",
    tableName: "transactions",
    underscored: true,
    timestamps: true,
    paranoid: true, // Enables soft deletion
    defaultScope: {
      attributes: {
        exclude: ["created_at", "updated_at", "deleted_at"],
      },
    },
    scopes: {
      withTimestamps: {
        attributes: { include: ["created_at", "updated_at"] },
      },
      unpaid: {
        where: { is_paid: false },
      },
      recurring: {
        where: { is_recurring: true },
      },
    },
  }
);

module.exports = { Transaction };
