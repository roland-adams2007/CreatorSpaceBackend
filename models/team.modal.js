const { db_connection } = require("../config/config.inc");

const Team = {
  // Get all team members for a website
  findByWebsite: async (websiteId, limit, offset) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT wu.*, u.fname, u.lname, u.email 
         FROM website_users wu
         JOIN users u ON wu.user_id = u.id
         WHERE wu.website_id = ?
         ORDER BY wu.created_at DESC
         LIMIT ? OFFSET ?`,
        [websiteId, limit, offset],
      );

      const [countResult] = await db_connection.execute(
        `SELECT COUNT(*) as total FROM website_users WHERE website_id = ?`,
        [websiteId],
      );

      const total = countResult[0]?.total || 0;
      return { members: rows || [], total };
    } catch (error) {
      console.error("Error fetching team members by website:", error);
      return { members: [], total: 0 };
    }
  },

  // Find team member by ID
  findById: async (id) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT * FROM team_invitations WHERE id = ?`,
        [id],
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error fetching team member by id:", error);
      return null;
    }
  },

  // Create team invitation
  createInvitation: async (data) => {
    try {
      const { website_id, email, invited_by, role, token_hash, expires_at } =
        data;

      const [result] = await db_connection.execute(
        `INSERT INTO team_invitations (
          website_id,
          email,
          invited_by,
          role,
          token_hash,
          status,
          expires_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())`,
        [website_id, email, invited_by, role, token_hash, expires_at],
      );
      return result.insertId;
    } catch (error) {
      console.error("Error creating team invitation:", error);
      return null;
    }
  },

  // Find invitation by token hash
  findInvitationByToken: async (tokenHash) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT * FROM team_invitations 
         WHERE token_hash = ? AND status = 'pending' AND expires_at > NOW()`,
        [tokenHash],
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error fetching invitation by token:", error);
      return null;
    }
  },

  // Accept team invitation
  acceptInvitation: async (
    invitationId,
    userId,
    invitedBy,
    websiteId,
    role,
  ) => {
    try {
      // Add user to website_users
      const [result] = await db_connection.execute(
        `INSERT INTO website_users (website_id, user_id, role, invited_by, is_active, created_at)
         VALUES (?, ?, ?, ?, 1, NOW())`,
        [websiteId, userId, role, invitedBy],
      );

      if (result.affectedRows === 0) {
        return false;
      }

      // Update invitation status
      await db_connection.execute(
        `UPDATE team_invitations 
         SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [invitationId],
      );

      return true;
    } catch (error) {
      console.error("Error accepting invitation:", error);
      return false;
    }
  },

  // Get pending invitations for a website
  getPendingInvitations: async (websiteId, limit, offset) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT ti.*, CONCAT(u.fname, ' ', u.lname) as inviter_name
         FROM team_invitations ti
         LEFT JOIN users u ON ti.invited_by = u.id
         WHERE ti.website_id = ? AND ti.status = 'pending' AND ti.expires_at > NOW()
         ORDER BY ti.created_at DESC
         LIMIT ? OFFSET ?`,
        [websiteId, limit, offset],
      );

      const [countResult] = await db_connection.execute(
        `SELECT COUNT(*) as total FROM team_invitations 
         WHERE website_id = ? AND status = 'pending' AND expires_at > NOW()`,
        [websiteId],
      );

      const total = countResult[0]?.total || 0;
      return { invitations: rows || [], total };
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      return { invitations: [], total: 0 };
    }
  },

  // Decline invitation
  declineInvitation: async (invitationId) => {
    try {
      const [result] = await db_connection.execute(
        `DELETE FROM team_invitations WHERE id = ?`,
        [invitationId],
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error declining invitation:", error);
      return false;
    }
  },

  // Remove team member
  removeMember: async (memberId) => {
    try {
      const [result] = await db_connection.execute(
        `DELETE FROM website_users WHERE id = ?`,
        [memberId],
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error removing team member:", error);
      return false;
    }
  },

  // Update member role
  updateMemberRole: async (memberId, role) => {
    try {
      const [result] = await db_connection.execute(
        `UPDATE website_users SET role = ? WHERE id = ?`,
        [role, memberId],
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error updating member role:", error);
      return false;
    }
  },
};

module.exports = Team;
