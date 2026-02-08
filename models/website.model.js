// models/website.model.js
const { db_connection } = require("../config/config.inc");

const Website = {
  findForUser: async (userId) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT w.id, w.name, w.slug, w.is_published
         FROM website_users wu
         JOIN websites w ON w.id = wu.website_id
         WHERE wu.user_id = ? AND wu.is_active = 1
         ORDER BY w.created_at DESC`,
        [userId],
      );
      return rows || [];
    } catch {
      return [];
    }
  },
};

module.exports = Website;
