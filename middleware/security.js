const rateLimit = require("express-rate-limit");

const security = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: {
    status: 400,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = security;
