const { db_connection } = require("../config/config.inc");

const Theme = {
  findForWebsite: async (websiteId, userId) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT 
          t.*,
          CASE 
            WHEN w.theme_id = t.id THEN 1 
            ELSE 0 
          END as is_active,
          u.email as user_email,
          CONCAT(u.fname, ' ', u.lname) as user_name,
          CASE 
            WHEN t.user_id IS NULL THEN 'system'
            WHEN t.user_id = ? THEN 'owner'
            ELSE 'shared'
          END as ownership
         FROM themes t
         LEFT JOIN users u ON t.user_id = u.id
         LEFT JOIN websites w ON w.id = ?
         WHERE t.is_active = 1
           AND (
             t.user_id IS NULL -- System themes
             OR t.user_id = ? -- User's own themes
             OR t.user_id IN (
               SELECT wu2.user_id 
               FROM website_users wu2 
               WHERE wu2.website_id = ? 
                 AND wu2.user_id = t.user_id
                 AND wu2.is_active = 1
             )
           )
         ORDER BY 
           t.user_id IS NULL DESC,
           t.created_at DESC`,
        [userId, websiteId, userId, websiteId]
      );
      return rows || [];
    } catch (error) {
      console.error("Theme findForWebsite error:", error);
      return [];
    }
  },

  findBySlug: async (slug) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT t.*, 
                u.email as user_email,
                CONCAT(u.fname, ' ', u.lname) as user_name
         FROM themes t
         LEFT JOIN users u ON t.user_id = u.id
         WHERE t.slug = ?`,
        [slug]
      );
      return rows[0];
    } catch (error) {
      console.error("Theme findBySlug error:", error);
      return null;
    }
  },

  findBySlugExcluding: async (slug, excludeId) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT id FROM themes WHERE slug = ? AND id != ?`,
        [slug, excludeId]
      );
      return rows[0];
    } catch (error) {
      console.error("Theme findBySlugExcluding error:", error);
      return null;
    }
  },

  findById: async (id) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT t.*, 
                u.email as user_email,
                CONCAT(u.fname, ' ', u.lname) as user_name
         FROM themes t
         LEFT JOIN users u ON t.user_id = u.id
         WHERE t.id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Theme findById error:", error);
      return null;
    }
  },

  create: async (data) => {
    try {
      const { user_id, name, slug, config_json, created_at, updated_at } = data;
      const [result] = await db_connection.execute(
        `INSERT INTO themes (user_id, name, slug, config_json, created_at, updated_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
          user_id || null,
          name,
          slug,
          JSON.stringify(config_json),
          created_at,
          updated_at,
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error("Theme create error:", error);
      return null;
    }
  },

  update: async (id, data) => {
    try {
      const { name, config_json, updated_at } = data;
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push("name = ?");
        values.push(name);
      }
      if (config_json !== undefined) {
        updates.push("config_json = ?");
        values.push(
          typeof config_json === "string"
            ? config_json
            : JSON.stringify(config_json)
        );
      }
      if (updated_at) {
        updates.push("updated_at = ?");
        values.push(updated_at);
      }

      if (updates.length === 0) {
        return false;
      }

      values.push(id);

      const [result] = await db_connection.execute(
        `UPDATE themes SET ${updates.join(", ")} WHERE id = ?`,
        values
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Theme update error:", error);
      return false;
    }
  },

  delete: async (id) => {
    try {
      // Check if theme is in use by any website
      const [websitesUsing] = await db_connection.execute(
        `SELECT id FROM websites WHERE theme_id = ?`,
        [id]
      );

      if (websitesUsing.length > 0) {
        throw new Error("Cannot delete theme that is in use by websites");
      }

      const [result] = await db_connection.execute(
        `DELETE FROM themes WHERE id = ? AND user_id IS NOT NULL`,
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Theme delete error:", error);
      throw error;
    }
  },

  checkUserAccess: async (themeId, userId) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT 1 FROM themes t
         WHERE t.id = ? 
           AND (
             t.user_id IS NULL -- System themes accessible to all
             OR t.user_id = ? -- Own themes
             OR EXISTS (
               SELECT 1 FROM website_users wu
               WHERE wu.user_id = ?
                 AND wu.is_active = 1
                 AND wu.website_id IN (
                   SELECT w.id FROM websites w
                   WHERE w.theme_id = t.id
                 )
             )
           )`,
        [themeId, userId, userId]
      );
      return rows.length > 0;
    } catch (error) {
      console.error("Theme checkUserAccess error:", error);
      return false;
    }
  },
};

module.exports = Theme;