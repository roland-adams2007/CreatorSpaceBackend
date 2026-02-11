const express = require("express");
const validateTokenHandler = require("../middleware/validateTokenHandler");
const {
  getThemes,
  getTheme,
  createTheme,
  updateTheme,
  deleteTheme,
  setActiveTheme,
} = require("../controllers/theme.controller");

const router = express.Router();

router.get("/", validateTokenHandler, getThemes);
router.get("/:themeSlug", validateTokenHandler, getTheme);
router.post("/create", validateTokenHandler, createTheme);
router.put("/:themeId", validateTokenHandler, updateTheme);
router.delete("/:themeId", validateTokenHandler, deleteTheme);
router.post("/:themeId/set-active", validateTokenHandler, setActiveTheme);

module.exports = router;