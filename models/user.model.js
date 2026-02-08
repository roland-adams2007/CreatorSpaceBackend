// models/user.model.js
const { db_connection } = require("../config/config.inc");

const User = {
  findByEmail: async (email) => {
    const [rows] = await db_connection.execute(
      `SELECT id, uuid, fname, lname, email, password_hash, is_active, email_verified_at
       FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  create: async ({ fname, lname, uuid, email, password_hash, is_active, created_at }) => {
    try {
      const [result] = await db_connection.execute(
        `INSERT INTO users (fname, lname, uuid, email, password_hash, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [fname, lname, uuid, email, password_hash, is_active ?? 1, created_at]
      );
      return result.insertId;
    } catch {
      return null;
    }
  },

  insertEmailToken: async ({ email, user_id, type, token_hash, expires_at, created_at }) => {
    try {
      const [result] = await db_connection.execute(
        `INSERT INTO email_tokens (email, user_id, type, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [email, user_id ?? null, type, token_hash, expires_at, created_at]
      );
      return result.insertId;
    } catch {
      return null;
    }
  },

  deleteEmailTokensForUser: async (user_id, type) => {
    try {
      await db_connection.execute(
        `DELETE FROM email_tokens WHERE user_id = ? AND type = ?`,
        [user_id, type]
      );
      return true;
    } catch {
      return false;
    }
  },

  findEmailTokenByHash: async (token_hash, type) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT et.*, u.is_active
         FROM email_tokens et
         JOIN users u ON et.user_id = u.id
         WHERE et.token_hash = ? AND et.type = ? AND et.is_used = 0
         LIMIT 1`,
        [token_hash, type]
      );
      return rows[0] || null;
    } catch {
      return null;
    }
  },

  markEmailTokenUsed: async (token_hash, nowUtc) => {
    try {
      await db_connection.execute(
        `UPDATE email_tokens SET is_used = 1, used_at = ? WHERE token_hash = ?`,
        [nowUtc, token_hash]
      );
      return true;
    } catch {
      return false;
    }
  },

  createSession: async ({
    user_id,
    session_id,
    ip_address,
    user_agent,
    device_label,
    created_at,
    last_seen_at,
  }) => {
    try {
      const [result] = await db_connection.execute(
        `INSERT INTO user_sessions (user_id, session_id, ip_address, user_agent, device_label, created_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          session_id,
          ip_address ?? null,
          user_agent ?? null,
          device_label ?? null,
          created_at,
          last_seen_at ?? null,
        ]
      );
      return result.insertId;
    } catch {
      return null;
    }
  },

  createRefreshToken: async ({ user_id, session_id, token_hash, expires_at, created_at }) => {
    try {
      const [result] = await db_connection.execute(
        `INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [user_id, session_id, token_hash, expires_at, created_at]
      );
      return result.insertId;
    } catch {
      return null;
    }
  },

  revokeSession: async (session_id, nowUtc) => {
    try {
      await db_connection.execute(
        `UPDATE user_sessions SET revoked_at = ? WHERE session_id = ?`,
        [nowUtc, session_id]
      );
      await db_connection.execute(
        `UPDATE refresh_tokens SET revoked_at = ? WHERE session_id = ? AND revoked_at IS NULL`,
        [nowUtc, session_id]
      );
      return true;
    } catch {
      return false;
    }
  },

  updateLastLogin: async (user_id, nowUtc) => {
    try {
      await db_connection.execute(
        `UPDATE users SET last_login_at = ? WHERE id = ?`,
        [nowUtc, user_id]
      );
      return true;
    } catch {
      return false;
    }
  },

  updateEmailVerify: async (user_id, nowUtc) => {
    try {
      await db_connection.execute(
        `UPDATE users SET email_verified_at = ? WHERE id = ?`,
        [nowUtc, user_id]
      );
      return true;
    } catch {
      return false;
    }
  },

  insertLoginAttempt: async ({ email, ip_address, success, created_at }) => {
    try {
      await db_connection.execute(
        `INSERT INTO login_attempts (email, ip_address, success, created_at) VALUES (?, ?, ?, ?)`,
        [email ?? null, ip_address ?? null, success ? 1 : 0, created_at]
      );
      return true;
    } catch {
      return false;
    }
  },

  fetchLoginAttempts: async (email, ip_address) => {
    const [rows] = await db_connection.execute(
      `SELECT COUNT(*) AS failed_attempts
       FROM login_attempts
       WHERE email = ? AND ip_address = ? AND success = 0 AND created_at >= (NOW() - INTERVAL 15 MINUTE)`,
      [email, ip_address]
    );
    return rows[0] || { failed_attempts: 0 };
  },

  clearFailedAttempts: async (email, ip_address) => {
    await db_connection.execute(
      `DELETE FROM login_attempts
       WHERE email = ? AND ip_address = ? AND success = 0`,
      [email, ip_address]
    );
  },
};

module.exports = User;
