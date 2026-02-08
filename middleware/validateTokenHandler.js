const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { db_connection, system } = require("../config/config.inc");

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const issueAccessToken = (user, session_id) => {
  return jwt.sign(
    {
      user: {
        uuid: user.uuid,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
      },
      session_id,
    },
    system.SECRET_KEY,
    { expiresIn: "1d" },
  );
};

const validateTokenHandler = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Authorization header is missing.");
  }

  const accessToken = authHeader.split(" ")[1];
  if (!accessToken) {
    res.status(401);
    throw new Error("Token is missing.");
  }

  let decoded;
  let tokenExpired = false;

  try {
    decoded = jwt.verify(accessToken, system.SECRET_KEY);
  } catch (err) {
    if (err?.name === "TokenExpiredError") tokenExpired = true;
    else {
      res.status(401);
      throw new Error("Invalid token.");
    }
  }

  if (tokenExpired) {
    const refreshTokenRaw = req.cookies?.refreshToken;
    const sessionCookie = req.cookies?.session_id;

    if (!refreshTokenRaw || !sessionCookie) {
      res.status(401);
      throw new Error("Session expired. Please log in again.");
    }

    const refreshHash = sha256(refreshTokenRaw);

    const [refreshRows] = await db_connection.execute(
      `SELECT id, user_id, session_id, expires_at, revoked_at
       FROM refresh_tokens
       WHERE token_hash = ? AND session_id = ? LIMIT 1`,
      [refreshHash, sessionCookie],
    );

    if (refreshRows.length === 0) {
      res.status(401);
      throw new Error("Invalid refresh token.");
    }

    const refresh = refreshRows[0];

    if (refresh.revoked_at) {
      res.status(401);
      throw new Error("Refresh token revoked. Please log in again.");
    }

    if (new Date(refresh.expires_at) <= new Date()) {
      res.status(401);
      throw new Error("Refresh token expired. Please log in again.");
    }

    const [sessions] = await db_connection.execute(
      `SELECT user_id, revoked_at
       FROM user_sessions
       WHERE session_id = ? LIMIT 1`,
      [refresh.session_id],
    );

    if (sessions.length === 0) {
      res.status(401);
      throw new Error("Session not found.");
    }

    if (sessions[0].revoked_at) {
      res.status(401);
      throw new Error("Session has been revoked.");
    }

    const [users] = await db_connection.execute(
      `SELECT id, uuid, fname, lname, email, is_active
       FROM users
       WHERE id = ? LIMIT 1`,
      [refresh.user_id],
    );

    if (users.length === 0) {
      res.status(401);
      throw new Error("User not found.");
    }

    const user = users[0];

    if (user.is_active !== 1) {
      res.status(403);
      throw new Error("Account is inactive.");
    }

    const newAccessToken = issueAccessToken(user, refresh.session_id);

    await db_connection.execute(
      `UPDATE user_sessions SET last_seen_at = NOW() WHERE session_id = ?`,
      [refresh.session_id],
    );

    res.setHeader("x-access-token", newAccessToken);

    req.user = {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      fname: user.fname,
      lname: user.lname,
    };

    req.session_id = refresh.session_id;
    req.accessToken = newAccessToken;

    return next();
  }

  if (!decoded.session_id || !decoded.user?.uuid) {
    res.status(401);
    throw new Error("Invalid token payload.");
  }

  const [sessions] = await db_connection.execute(
    `SELECT user_id, revoked_at
     FROM user_sessions
     WHERE session_id = ? LIMIT 1`,
    [decoded.session_id],
  );

  if (sessions.length === 0) {
    res.status(401);
    throw new Error("Session not found.");
  }

  const session = sessions[0];

  if (session.revoked_at) {
    res.status(401);
    throw new Error("Session has been revoked.");
  }

  const [users] = await db_connection.execute(
    `SELECT id, uuid, fname, lname, email, is_active
     FROM users
     WHERE id = ? LIMIT 1`,
    [session.user_id],
  );

  if (users.length === 0) {
    res.status(401);
    throw new Error("User not found.");
  }

  const user = users[0];

  if (user.is_active !== 1) {
    res.status(403);
    throw new Error("Account is inactive.");
  }

  await db_connection.execute(
    `UPDATE user_sessions SET last_seen_at = NOW() WHERE session_id = ?`,
    [decoded.session_id],
  );

  req.user = {
    id: user.id,
    uuid: user.uuid,
    email: user.email,
    fname: user.fname,
    lname: user.lname,
  };

  req.session_id = decoded.session_id;

  next();
});

module.exports = validateTokenHandler;
