const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { randomUUID } = require("crypto");

const { responseHandler } = require("../middleware/responseHandler.js");
const generateUUID = require("../utils/generateUUID.js");
const User = require("../models/user.model.js");
const Website = require("../models/website.model.js");
const generateToken = require("../utils/generateToken.js");

const { getDeviceInfo, getLocation } = require("../utils/loginInfo.js");
const emailQueue = require("../services/queues/email.queue.js");
const { system } = require("../config/config.inc.js");

const { checkEmailRateLimit } = require("../utils/emailRateLimit.js");

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const loginUser = asyncHandler(async function (req, res) {
  const { email, password } = req.body;

  const ipAddress =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket.remoteAddress;

  const nowUtc = new Date().toISOString().slice(0, 19).replace("T", " ");

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const recentAttempts = await User.fetchLoginAttempts(email, ipAddress);
  if (recentAttempts && recentAttempts.failed_attempts >= 5) {
    res.status(429);
    throw new Error("Too many login attempts. Please try again later.");
  }

  const user = await User.findByEmail(email);

  const dummyHash = await bcrypt.hash("dummy_password", 10);
  const passwordHash = user?.password_hash || dummyHash;

  const isPasswordValid = await bcrypt.compare(password, passwordHash);

  if (!user || !isPasswordValid) {
    await User.insertLoginAttempt({
      email,
      ip_address: ipAddress,
      success: 0,
      created_at: nowUtc,
    });
    res.status(400);
    throw new Error("Invalid credentials");
  }

  if (user.is_active !== 1) {
    res.status(403);
    throw new Error("Account is inactive. Please contact support.");
  }

  if (!user.email_verified_at) {
    const rawToken = generateToken();
    const tokenHash = sha256(rawToken);

    const expiresAtUtc = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    await User.deleteEmailTokensForUser(user.id, "verification");
    const saved = await User.insertEmailToken({
      email: user.email,
      user_id: user.id,
      type: "verification",
      token_hash: tokenHash,
      expires_at: expiresAtUtc,
      created_at: nowUtc,
    });

    if (!saved) {
      res.status(500);
      throw new Error("Failed to create verification token. Please try again.");
    }

    const rl = await checkEmailRateLimit(
      `${user.email}:VERIFY_EMAIL`,
      ipAddress,
      5,
      60,
    );

    if (rl.allowed) {
      await emailQueue.add("sendEmail", {
        type: "VERIFY_EMAIL",
        payload: { to: user.email, name: user.fname, token: rawToken },
      });
    }

    res.status(403);
    throw new Error(
      "Account not verified. A new verification email has been sent.",
    );
  }

  const session_id = randomUUID();
  const uaString = req.headers["user-agent"] || "";
  const deviceLabel = getDeviceInfo(uaString);

  const sessionCreated = await User.createSession({
    user_id: user.id,
    session_id,
    ip_address: ipAddress,
    user_agent: uaString,
    device_label: deviceLabel,
    created_at: nowUtc,
    last_seen_at: nowUtc,
  });

  if (!sessionCreated) {
    await User.insertLoginAttempt({
      email,
      ip_address: ipAddress,
      success: 0,
      created_at: nowUtc,
    });
    res.status(500);
    throw new Error("Unable to login");
  }

  const refreshTokenRaw = crypto.randomBytes(32).toString("hex");
  const refreshTokenHash = sha256(refreshTokenRaw);
  const refreshExpiresAtUtc = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const refreshSaved = await User.createRefreshToken({
    user_id: user.id,
    session_id,
    token_hash: refreshTokenHash,
    expires_at: refreshExpiresAtUtc,
    created_at: nowUtc,
  });

  if (!refreshSaved) {
    await User.revokeSession(session_id, nowUtc);
    await User.insertLoginAttempt({
      email,
      ip_address: ipAddress,
      success: 0,
      created_at: nowUtc,
    });
    res.status(500);
    throw new Error("Unable to login");
  }

  const accessToken = jwt.sign(
    {
      user: {
        uuid: user.uuid,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        id: user.id,
      },
      session_id,
    },
    system.SECRET_KEY,
    { expiresIn: "1d" },
  );

  const location = await getLocation(ipAddress);

  const notifyRl = await checkEmailRateLimit(
    `${user.email}:NOTIFY_USER`,
    ipAddress,
    5,
    60,
  );

  if (notifyRl.allowed) {
    await emailQueue.add("sendEmail", {
      type: "NOTIFY_USER",
      payload: {
        email: user.email,
        userName: user.fname,
        loginTime: nowUtc,
        ipAddress,
        deviceInfo: deviceLabel,
        location,
      },
    });
  }

  await User.insertLoginAttempt({
    email,
    ip_address: ipAddress,
    success: 1,
    created_at: nowUtc,
  });
  await User.clearFailedAttempts(email, ipAddress);
  await User.updateLastLogin(user.id, nowUtc);

  res.cookie("refreshToken", refreshTokenRaw, {
    httpOnly: true,
    secure: system.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.cookie("session_id", session_id, {
    httpOnly: true,
    secure: system.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  responseHandler(
    res,
    {
      token: accessToken,
      user: {
        uuid: user.uuid,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
      },
    },
    "Login successful",
  );
});

const regUser = asyncHandler(async function (req, res) {
  const { fname, lname, email, password } = req.body;

  const ipAddress =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket.remoteAddress;

  if (!fname) {
    res.status(400);
    throw new Error("Firstname is required");
  }
  if (!lname) {
    res.status(400);
    throw new Error("Lastname is required");
  }
  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }
  if (!password) {
    res.status(400);
    throw new Error("Password is required");
  }

  const existingEmail = await User.findByEmail(email);
  if (existingEmail) {
    res.status(400);
    throw new Error("Email already exists");
  }

  const password_hash = await bcrypt.hash(password, 10);
  const nowUtc = new Date().toISOString().slice(0, 19).replace("T", " ");
  const uuid = generateUUID();

  const newUserId = await User.create({
    fname,
    lname,
    uuid,
    email,
    password_hash,
    is_active: 1,
    created_at: nowUtc,
  });

  if (!newUserId) {
    res.status(400);
    throw new Error("Unable to register");
  }

  const rawToken = generateToken();
  const tokenHash = sha256(rawToken);

  const expiresAtUtc = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  await User.deleteEmailTokensForUser(newUserId, "verification");
  const saved = await User.insertEmailToken({
    email,
    user_id: newUserId,
    type: "verification",
    token_hash: tokenHash,
    expires_at: expiresAtUtc,
    created_at: nowUtc,
  });

  if (!saved) {
    res.status(400);
    throw new Error("Failed to create verification token");
  }

  const rl = await checkEmailRateLimit(
    `${email}:VERIFY_EMAIL`,
    ipAddress,
    5,
    60,
  );

  if (rl.allowed) {
    await emailQueue.add("sendEmail", {
      type: "VERIFY_EMAIL",
      payload: { to: email, name: fname, token: rawToken },
    });
  }

  res.status(201);
  responseHandler(
    res,
    {},
    "Registered successfully! Check your email to verify your account.",
  );
});

const verifyUser = asyncHandler(async function (req, res) {
  const { token } = req.body;
  if (!token) {
    res.status(400);
    throw new Error("Token is required");
  }

  const tokenHash = sha256(token);
  const tokenRecord = await User.findEmailTokenByHash(
    tokenHash,
    "verification",
  );
  if (!tokenRecord) {
    res.status(400);
    throw new Error("Invalid or expired token");
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    res.status(400);
    throw new Error("Token has expired");
  }

  const nowUtc = new Date().toISOString().slice(0, 19).replace("T", " ");
  const activateResult = await User.updateEmailVerify(
    tokenRecord.user_id,
    nowUtc,
  );

  if (!activateResult) {
    res.status(500);
    throw new Error("Failed to activate user");
  }

  await User.markEmailTokenUsed(tokenHash, nowUtc);
  res.status(200);
  responseHandler(res, {}, "Email verified successfully. You can now log in.");
});

const userCompanyCheck = asyncHandler(async function (req, res) {
  const userId = req.user?.id;
  const websites = await Website.findForUser(userId);
  res.status(200);
  responseHandler(res, { websites: websites || [] }, "User websites");
});

const currentUser = asyncHandler(async function (req, res) {
  res.status(200);
  responseHandler(res, req.user, "Current user");
});

module.exports = {
  loginUser,
  regUser,
  currentUser,
  verifyUser,
  userCompanyCheck,
};
