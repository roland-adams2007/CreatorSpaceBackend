const { checkEmailRateLimit } = require("../utils/emailRateLimit");

const emailRateLimitMiddleware = (maxEmails = 5, windowSeconds = 60) => {
  return async (req, res, next) => {
    try {
      const email = req.body.email || req.user?.email;
      if (!email) return next();

      const ipAddress =
        (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
        req.socket.remoteAddress;

      const type =
        req.emailRateLimitType ||
        req.body.emailType ||
        req.headers["x-email-type"] ||
        "GENERAL";

      const rateLimit = await checkEmailRateLimit(
        email,
        ipAddress,
        maxEmails,
        windowSeconds,
        type,
      );

      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          message: `Too many emails sent. Please wait ${rateLimit.resetIn} seconds before trying again.`,
          resetIn: rateLimit.resetIn,
        });
      }

      req.emailRateLimit = rateLimit;
      next();
    } catch (error) {
      console.error("❌ Email rate limit middleware error:", error.message);
      next();
    }
  };
};

module.exports = emailRateLimitMiddleware;
