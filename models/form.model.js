const { db_connection } = require("../config/config.inc");

const Form = {
  findByWebsite: async (websiteId, limit, offset) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT * FROM forms
       WHERE website_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
        [websiteId, limit, offset],
      );

      const [countResult] = await db_connection.execute(
        `SELECT COUNT(*) as total
       FROM forms
       WHERE website_id = ?`,
        [websiteId],
      );

      const total = countResult[0]?.total || 0;

      return { forms: rows || [], total };
    } catch (error) {
      console.error("Error fetching forms by website:", error);
      return { forms: [], total: 0 };
    }
  },

  findById: async (id) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT * FROM forms WHERE id = ?`,
        [id],
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error fetching form by id:", error);
      return null;
    }
  },

  create: async (data) => {
    try {
      const { website_id, form_data, created_at } = data;

      const [result] = await db_connection.execute(
        `INSERT INTO forms (
          website_id,
          form_data,
          created_at
        ) VALUES (?, ?, ?)`,
        [website_id, JSON.stringify(form_data), created_at || new Date()],
      );
      return result.insertId;
    } catch (error) {
      console.error("Error creating form:", error);
      return null;
    }
  },

  update: async (id, data) => {
    try {
      const { form_data } = data;

      const [result] = await db_connection.execute(
        `UPDATE forms SET form_data = ?, updated_at = NOW() WHERE id = ?`,
        [JSON.stringify(form_data), id],
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error updating form:", error);
      return false;
    }
  },

  delete: async (id) => {
    try {
      const [result] = await db_connection.execute(
        `DELETE FROM forms WHERE id = ?`,
        [id],
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error deleting form:", error);
      return false;
    }
  },

  deleteByWebsite: async (websiteId) => {
    try {
      const [result] = await db_connection.execute(
        `DELETE FROM forms WHERE website_id = ?`,
        [websiteId],
      );
      return result.affectedRows;
    } catch (error) {
      console.error("Error deleting forms by website:", error);
      return 0;
    }
  },
};

module.exports = Form;
