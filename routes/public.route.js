const express = require("express");
const {
  getPublicTheme,
  getPublicWebsiteInfo,
  getPublicActiveTheme,
  getPublicWebsiteThemes,
} = require("../controllers/theme.controller");

const router = express.Router();
router.get("/themes/:themeSlug", getPublicTheme);
router.get("/websites/:websiteSlug", getPublicWebsiteInfo);
router.get("/websites/:websiteSlug/active-theme", getPublicActiveTheme);
router.get("/websites/:websiteSlug/themes", getPublicWebsiteThemes);

module.exports = router;
