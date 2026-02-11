const express = require("express");
const validateTokenHandler = require("../middleware/validateTokenHandler");
const {
  getAssets,
  uploadAsset,
  deleteAsset,
} = require("../controllers/asset.controller");

const router = express.Router();

router.get("/", validateTokenHandler, getAssets);
router.post("/upload", validateTokenHandler, uploadAsset);
router.delete("/:assetId", validateTokenHandler, deleteAsset);

module.exports = router;