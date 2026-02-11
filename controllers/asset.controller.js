const asyncHandler = require("express-async-handler");
const { responseHandler } = require("../middleware/responseHandler.js");
const Asset = require("../models/asset.model.js");
const Website = require("../models/website.model.js");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const { file_config } = require("../config/config.inc.js");

const getAssets = asyncHandler(async function (req, res) {
  const { website_id } = req.query;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  if (!website_id) {
    res.status(400);
    throw new Error("Website ID is required");
  }

  const hasAccess = await Website.checkUserAccess(website_id, userId);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this website");
  }

  const assets = await Asset.findByWebsite(website_id);

  res.status(200);
  responseHandler(res, { assets }, "Assets retrieved");
});

const uploadAsset = asyncHandler(async function (req, res) {
  const { website_id, file } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  if (!website_id) {
    res.status(400);
    throw new Error("Website ID is required");
  }

  const hasAccess = await Website.checkUserAccess(website_id, userId);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this website");
  }

  if (!file) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  try {
    const response = await axios.post(
      "https://projectapi.tixora.com.ng/fileflow/files/api/upload",
      {
        image: file,
        folderName: String(userId) || "general",
      },
      {
        headers: {
          Authorization: `Bearer ${file_config.apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.data || !response.data.data) {
      throw new Error("Invalid response from file upload service");
    }

    const uploadData = response.data.data;
    const nowUtc = new Date().toISOString().slice(0, 19).replace("T", " ");

    const assetId = await Asset.create({
      website_id,
      file_uuid: uploadData.uuid || uuidv4(),
      file_original_name: uploadData.file_original_name,
      file_url: uploadData.file_url,
      file_name: uploadData.file_name,
      file_size: uploadData.file_size,
      mime_type: uploadData.type,
      extension: uploadData.extension,
      created_at: nowUtc,
    });

    if (!assetId) {
      res.status(500);
      throw new Error("Failed to save asset");
    }

    const asset = await Asset.findById(assetId);

    res.status(201);
    responseHandler(res, { asset }, "File uploaded successfully");
  } catch (error) {
    res.status(500);
    throw new Error(`File upload failed: ${error.message}`);
  }
});

const deleteAsset = asyncHandler(async function (req, res) {
  const { assetId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const asset = await Asset.findById(assetId);

  if (!asset) {
    res.status(404);
    throw new Error("Asset not found");
  }

  const hasAccess = await Website.checkUserAccess(asset.website_id, userId);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied");
  }

  const deleted = await Asset.delete(assetId);

  if (!deleted) {
    res.status(500);
    throw new Error("Failed to delete asset");
  }

  res.status(200);
  responseHandler(res, null, "Asset deleted successfully");
});

module.exports = {
  getAssets,
  uploadAsset,
  deleteAsset,
};
