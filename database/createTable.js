const { db_connection } = require("../config/config.inc");
const fs = require("fs");
const path = require("path");

async function runMigrations() {
  const migrationFiles = ["creator.sql"];

  try {
    for (const file of migrationFiles) {
      const filePath = path.join(__dirname, file);
      const sql = fs.readFileSync(filePath, "utf8");

      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await db_connection.query(statement + ";");
      }

      console.log(`✅ Migration ${file} completed!`);
    }

    console.log("🎉 All migrations completed successfully!");
  } catch (err) {
    console.error("❌ Error running migrations:", err);
    throw err;
  }
}

module.exports = runMigrations;
