const asyncHandler = require("express-async-handler");
const { responseHandler } = require("../middleware/responseHandler.js");
const generateUUID = require("../utils/generateUUID.js");
const Website = require("../models/website.model.js");

const generateUniqueSlug = require("../utils/slugify.js");

const createWebsite = asyncHandler(async function (req, res) {
  const { name } = req.body;
  const userId = req.user?.id;

  const nowUtc = new Date().toISOString().slice(0, 19).replace("T", " ");

  if (!name || name.trim().length < 2) {
    res.status(400);
    throw new Error("Website name is required");
  }

  if (!userId) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const slug = await generateUniqueSlug(name);

  const websiteId = await Website.create({
    name,
    slug,
    created_at: nowUtc,
    updated_at: nowUtc,
  });

  if (!websiteId) {
    res.status(500);
    throw new Error("Failed to create website");
  }

  const userAdded = await Website.addWebsiteUser({
    website_id: websiteId,
    user_id: userId,
    role: "owner",
    is_active: 1,
    created_at: nowUtc,
  });

  if (!userAdded) {
    await Website.deleteById(websiteId);
    res.status(500);
    throw new Error("Failed to assign website to user");
  }

  res.status(201);
  responseHandler(
    res,
    {
      website: {
        id: websiteId,
        name,
        slug,
        created_at: nowUtc,
      },
    },
    "Website created successfully",
  );
});

const getWebsites = asyncHandler(async function (req, res) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const websites = await Website.findForUser(userId);

  res.status(200);
  responseHandler(res, { websites: websites || [] }, "User websites retrieved");
});

const getWebsite = asyncHandler(async function (req, res) {
  const userId = req.user?.id;
  const { websiteId } = req.params;

  if (!userId) {
    res.status(401);
    throw new Error("User not authenticated");
  }
  if (!websiteId) {
    res.status(400);
    throw new Error("Website ID is required");
  }

  const website = await Website.findById(websiteId, userId);

  if (!website) {
    res.status(404);
    throw new Error("Website not found or access denied");
  }

  res.status(200);
  responseHandler(res, { website }, "Website retrieved");
});

module.exports = {
  createWebsite,
  getWebsites,
  getWebsite,
};
