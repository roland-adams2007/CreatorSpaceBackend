const { redis } = require("../config/config.inc");

const normalize = (v = "") => String(v).trim().toLowerCase();

const makeKey = (email, ipAddress, type) =>
  `email_rate_limit:${normalize(type)}:${normalize(email)}:${normalize(ipAddress || "unknown")}`;

const checkEmailRateLimit = async (
  email,
  ipAddress,
  maxEmails = 5,
  windowSeconds = 60,
  type = "GENERAL",
) => {
  try {
    const key = makeKey(email, ipAddress, type);

    const newCount = await redis.incr(key);

    if (newCount === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (newCount > maxEmails) {
      const ttl = await redis.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        resetIn: ttl > 0 ? ttl : windowSeconds,
      };
    }

    const ttl = await redis.ttl(key);

    return {
      allowed: true,
      remaining: Math.max(0, maxEmails - newCount),
      resetIn: ttl > 0 ? ttl : windowSeconds,
    };
  } catch (error) {
    console.error("❌ Email rate limit check failed:", error.message);
    return {
      allowed: true,
      remaining: maxEmails,
      resetIn: windowSeconds,
    };
  }
};

const resetEmailRateLimit = async (email, ipAddress, type = "GENERAL") => {
  try {
    const key = makeKey(email, ipAddress, type);
    await redis.del(key);
    return true;
  } catch (error) {
    console.error("❌ Failed to reset email rate limit:", error.message);
    return false;
  }
};

const getEmailRateLimitStatus = async (
  email,
  ipAddress,
  maxEmails = 5,
  type = "GENERAL",
) => {
  try {
    const key = makeKey(email, ipAddress, type);
    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;
    const ttl = await redis.ttl(key);

    return {
      count,
      remaining: Math.max(0, maxEmails - count),
      resetIn: ttl > 0 ? ttl : 0,
      isLimited: count >= maxEmails,
    };
  } catch (error) {
    console.error("❌ Failed to get rate limit status:", error.message);
    return {
      count: 0,
      remaining: maxEmails,
      resetIn: 0,
      isLimited: false,
    };
  }
};

module.exports = {
  checkEmailRateLimit,
  resetEmailRateLimit,
  getEmailRateLimitStatus,
};
