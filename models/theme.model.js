const { db_connection } = require("../config/config.inc");

const Theme = {
  findForWebsite: async (websiteId, userId) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT
      wt.id,
      wt.website_id,
      wt.template_id,
      wt.name,
      wt.slug,
      wt.is_active,
      CAST(wt.config_json AS CHAR) AS config_json,

      tt.name AS template_name,
      CAST(tt.base_config_json AS CHAR) AS template_config,

      CASE WHEN w.website_theme_id = wt.id THEN 1 ELSE 0 END AS is_active_theme,

      u.email AS user_email,
      CONCAT(u.fname, ' ', u.lname) AS user_name
   FROM website_themes wt
   LEFT JOIN theme_templates tt ON wt.template_id = tt.id
   LEFT JOIN websites w ON w.id = wt.website_id

   LEFT JOIN users u ON u.id = (
      SELECT wu.user_id
      FROM website_users wu
      WHERE wu.website_id = wt.website_id
        AND wu.role IN ('owner', 'admin')
      ORDER BY wu.id ASC
      LIMIT 1
   )

   WHERE wt.website_id = ?
     AND EXISTS (
       SELECT 1
       FROM website_users wu2
       WHERE wu2.website_id = wt.website_id
         AND wu2.user_id = ?
         AND wu2.is_active = 1
     )
   ORDER BY wt.created_at DESC`,
        [websiteId, userId],
      );
      return (rows || []).map((r) => {
        try {
          if (r.config_json) {
            if (Buffer.isBuffer(r.config_json))
              r.config_json = r.config_json.toString();

            if (typeof r.config_json === "string")
              r.config_json = JSON.parse(r.config_json);
          }

          if (r.template_config) {
            if (Buffer.isBuffer(r.template_config))
              r.template_config = r.template_config.toString();

            if (typeof r.template_config === "string")
              r.template_config = JSON.parse(r.template_config);
          }
        } catch (e) {
          console.log("JSON normalize error:", e);
        }
        return r;
      });
    } catch (error) {
      console.error("Theme findForWebsite error:", error);
      return [];
    }
  },

  findBySlug: async (slug) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT wt.*, 
                tt.name as template_name,
                tt.base_config_json as template_config,
                u.email as user_email,
                CONCAT(u.fname, ' ', u.lname) as user_name
         FROM website_themes wt
         LEFT JOIN theme_templates tt ON wt.template_id = tt.id
         LEFT JOIN website_users wu ON wu.website_id = wt.website_id
         LEFT JOIN users u ON wu.user_id = u.id
         WHERE wt.slug = ? 
         LIMIT 1`,
        [slug],
      );
      return rows[0];
    } catch (error) {
      console.error("Theme findBySlug error:", error);
      return null;
    }
  },

  findBySlugAndWebsite: async (slug, websiteId) => {
    try {
      const [rows] = await db_connection.execute(
        "SELECT * FROM website_themes WHERE slug = ? AND website_id = ?",
        [slug, websiteId],
      );
      return rows[0];
    } catch (error) {
      console.error("Theme findBySlugAndWebsite error:", error);
      return null;
    }
  },

  findBySlugExcluding: async (slug, websiteId, excludeId) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT id FROM website_themes 
         WHERE slug = ? AND website_id = ? AND id != ?`,
        [slug, websiteId, excludeId],
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
        `SELECT wt.*, 
                tt.name as template_name,
                tt.base_config_json as template_config,
                w.name as website_name,
                w.slug as website_slug
         FROM website_themes wt
         LEFT JOIN theme_templates tt ON wt.template_id = tt.id
         LEFT JOIN websites w ON wt.website_id = w.id
         WHERE wt.id = ?`,
        [id],
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Theme findById error:", error);
      return null;
    }
  },

  create: async (data) => {
    try {
      const {
        website_id,
        template_id,
        name,
        slug,
        config_json,
        created_at,
        updated_at,
      } = data;

      const payload =
        config_json === undefined || config_json === null
          ? null
          : typeof config_json === "string"
            ? config_json
            : JSON.stringify(config_json);

      const [result] = await db_connection.execute(
        `INSERT INTO website_themes
       (website_id, template_id, name, slug, config_json, created_at, updated_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          website_id,
          template_id || null,
          name,
          slug,
          payload,
          created_at,
          updated_at,
        ],
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
            : JSON.stringify(config_json),
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
        `UPDATE website_themes SET ${updates.join(", ")} WHERE id = ?`,
        values,
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Theme update error:", error);
      return false;
    }
  },

  delete: async (id) => {
    try {
      // Check if theme is currently active for the website
      const [themeData] = await db_connection.execute(
        `SELECT wt.website_id, w.website_theme_id 
         FROM website_themes wt
         LEFT JOIN websites w ON wt.website_id = w.id
         WHERE wt.id = ?`,
        [id],
      );

      if (
        themeData.length > 0 &&
        themeData[0].website_theme_id === parseInt(id)
      ) {
        throw new Error(
          "Cannot delete theme that is currently active for the website",
        );
      }

      const [result] = await db_connection.execute(
        `DELETE FROM website_themes WHERE id = ?`,
        [id],
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
        `SELECT 1 FROM website_themes wt
         JOIN website_users wu ON wt.website_id = wu.website_id
         WHERE wt.id = ? 
           AND wu.user_id = ?
           AND wu.is_active = 1`,
        [themeId, userId],
      );
      return rows.length > 0;
    } catch (error) {
      console.error("Theme checkUserAccess error:", error);
      return false;
    }
  },

  // New method to get available templates
  getTemplates: async () => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT * FROM theme_templates 
         WHERE is_active = 1 
         ORDER BY name ASC`,
      );
      return rows || [];
    } catch (error) {
      console.error("Theme getTemplates error:", error);
      return [];
    }
  },

  // New method to get template by ID
  getTemplateById: async (templateId) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT * FROM theme_templates WHERE id = ?`,
        [templateId],
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Theme getTemplateById error:", error);
      return null;
    }
  },
};

module.exports = Theme;
