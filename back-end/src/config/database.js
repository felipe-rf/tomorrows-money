const { sequelize } = require("./sequelize");
require("../models/Associations"); // This will set up all associations

const syncDatabase = async () => {
  try {
    console.log("🔄 Connecting to database...");

    await sequelize.authenticate();
    console.log("✅ Database connection established.");

    console.log("🔄 Synchronizing database tables...");

    // DANGER: This will drop all tables and recreate them
    // Only use in development!
    await sequelize.sync({
      force: false, // ⚠️ WARNING: This drops all existing data!
    });

    console.log("✅ Database tables synchronized successfully.");
  } catch (error) {
    console.error("❌ Database synchronization failed:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      sql: error.sql,
    });
    throw error;
  }
};

module.exports = { syncDatabase };
