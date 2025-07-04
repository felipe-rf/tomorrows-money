const { DataTypes, Model, Op } = require("sequelize");
const { sequelize } = require("../config/sequelize");

class Goal extends Model {}

Goal.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    target_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    current_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      validate: {
        min: 0,
      },
    },
    target_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "#3b82f6",
      validate: {
        is: /^#[0-9A-Fa-f]{6}$/,
      },
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high"),
      allowNull: false,
      defaultValue: "medium",
    },
    auto_deduct: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "Goal",
    tableName: "goals",
    underscored: true,
    timestamps: true,
    paranoid: false,
    defaultScope: {
      attributes: {
        exclude: ["created_at", "updated_at"],
      },
    },
    scopes: {
      active: {
        where: { is_completed: false },
      },
      completed: {
        where: { is_completed: true },
      },
      overdue: {
        where: {
          is_completed: false,
          target_date: { [Op.lt]: new Date() },
        },
      },
    },
  }
);

module.exports = { Goal };
