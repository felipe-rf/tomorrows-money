const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/sequelize");

class Category extends Model {}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    description: DataTypes.STRING,
    color: DataTypes.STRING,
    icon: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: "Category",
    tableName: "categories",
    underscored: true,
    timestamps: true,
  }
);

module.exports = { Category };
