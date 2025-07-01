const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/sequelize");

class TransactionTag extends Model {}

TransactionTag.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      onDelete: "CASCADE",
    },
    tag_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      onDelete: "CASCADE",
    },
  },
  {
    sequelize,
    modelName: "TransactionTag",
    tableName: "transaction_tags",
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["transaction_id", "tag_id"], // Prevent duplicate tag assignments
      },
      {
        fields: ["tag_id"], // For searching tags
      },
    ],
  }
);

module.exports = { TransactionTag };
