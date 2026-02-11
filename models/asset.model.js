const { db_connection } = require("../config/config.inc");

const Asset = {
  findByWebsite: async (websiteId) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT * FROM website_assets 
         WHERE website_id = ? 
         ORDER BY created_at DESC`,
        [websiteId],
      );
      return rows || [];
    } catch (error) {
      return [];
    }
  },

  findById: async (id) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT * FROM website_assets WHERE id = ?`,
        [id],
      );
      return rows[0] || null;
    } catch {
      return null;
    }
  },

  findByUuid: async (fileUuid) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT * FROM website_assets WHERE file_uuid = ?`,
        [fileUuid],
      );
      return rows[0] || null;
    } catch {
      return null;
    }
  },

  create: async (data) => {
    try {
      const {
        website_id,
        file_uuid,
        file_original_name,
        file_url,
        file_name,
        file_size,
        mime_type,
        extension,
        created_at,
      } = data;

      const [result] = await db_connection.execute(
        `INSERT INTO website_assets (
          website_id,
          file_uuid,
          file_original_name,
          file_path,
          file_name,
          file_size,
          mime_type,
          extension,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          website_id,
          file_uuid,
          file_original_name,
          file_url,
          file_name,
          file_size,
          mime_type,
          extension,
          created_at,
        ],
      );
      return result.insertId;
    } catch (error) {
      console.log(error);
      return null;
    }
  },

  delete: async (id) => {
    try {
      const [result] = await db_connection.execute(
        `DELETE FROM website_assets WHERE id = ?`,
        [id],
      );
      return result.affectedRows > 0;
    } catch {
      return false;
    }
  },

  deleteByWebsite: async (websiteId) => {
    try {
      const [result] = await db_connection.execute(
        `DELETE FROM website_assets WHERE website_id = ?`,
        [websiteId],
      );
      return result.affectedRows;
    } catch {
      return 0;
    }
  },
};

module.exports = Asset;
