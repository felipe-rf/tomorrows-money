const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/sequelize");

class Tag extends Model {}

Tag.init(
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
    color: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: "Tag",
    tableName: "tags",
    underscored: true,
    timestamps: true,
  }
);

module.exports = { Tag };
