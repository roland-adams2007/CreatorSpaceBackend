const { db_connection } = require("../config/config.inc");

const Website = {
  findForUser: async (userId) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT w.id, w.name, w.slug, w.is_published, w.created_at
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

  // New methods
  findBySlug: async (slug) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT id FROM websites WHERE slug = ?`,
        [slug],
      );
      return rows[0];
    } catch {
      return null;
    }
  },

  findBySlugExcluding: async (slug, excludeId) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT id FROM websites WHERE slug = ? AND id != ?`,
        [slug, excludeId],
      );
      return rows[0];
    } catch {
      return null;
    }
  },

  findById: async (id, userId) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT w.id, w.name, w.slug, w.is_published, w.created_at, w.updated_at
         FROM websites w
         JOIN website_users wu ON w.id = wu.website_id
         WHERE w.id = ? AND wu.user_id = ? AND wu.is_active = 1`,
        [id, userId],
      );
      return rows[0] || null;
    } catch {
      return null;
    }
  },

  create: async (data) => {
    try {
      const { name, slug, created_at, updated_at } = data;
      const [result] = await db_connection.execute(
        `INSERT INTO websites (name, slug, created_at, updated_at, is_published)
         VALUES (?, ?, ?, ?, 0)`,
        [name, slug, created_at, updated_at],
      );
      return result.insertId;
    } catch (error) {
      console.log(error);
      return null;
    }
  },

  addWebsiteUser: async (data) => {
    try {
      const { website_id, user_id, role, is_active, created_at } = data;
      const [result] = await db_connection.execute(
        `INSERT INTO website_users (website_id, user_id, role, is_active, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [website_id, user_id, role, is_active, created_at],
      );
      return result.affectedRows > 0;
    } catch {
      return false;
    }
  },

  checkUserAccess: async (websiteId, userId) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT 1 FROM website_users 
         WHERE website_id = ? AND user_id = ? AND is_active = 1`,
        [websiteId, userId],
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  },

  checkUserRole: async (websiteId, userId, role) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT 1 FROM website_users 
         WHERE website_id = ? AND user_id = ? AND role = ? AND is_active = 1`,
        [websiteId, userId, role],
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  },
};

module.exports = Website;
