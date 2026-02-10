const express = require("express");
const validateTokenHandler = require("../middleware/validateTokenHandler");
const {
  createWebsite,
  getWebsites,
  getWebsite,
} = require("../controllers/website.controller");

const router = express.Router();

router.post("/create", validateTokenHandler, createWebsite);
router.get("/", validateTokenHandler, getWebsites);
router.get("/:websiteId", validateTokenHandler, getWebsite);

module.exports = router;
