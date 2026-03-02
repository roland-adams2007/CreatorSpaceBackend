const express = require("express");
const validateTokenHandler = require("../middleware/validateTokenHandler");
const {
  trackPageView,
  trackEvent,
  trackPerformance,
  trackFormAnalytics,
  updateSessionExit,
  getOverview,
} = require("../controllers/analytics.controller");

const router = express.Router();

router.post("/track/pageview",     trackPageView);
router.post("/track/event",        trackEvent);
router.post("/track/performance",  trackPerformance);
router.post("/track/form",         trackFormAnalytics);
router.post("/track/session-exit", updateSessionExit);

router.get("/:website_id/overview", validateTokenHandler, getOverview);

module.exports = router;