const asyncHandler = require("express-async-handler");
const { responseHandler } = require("../middleware/responseHandler.js");
const Website = require("../models/website.model.js");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const { file_config } = require("../config/config.inc.js");
const Form = require("../models/form.model.js");

const sendForm = asyncHandler(async function (req, res) {
  const nowUtc = new Date().toISOString().slice(0, 19).replace("T", " ");
  const { website_id, section_type, section_id, data } = req.body;

  if (!website_id) {
    res.status(400);
    throw new Error("Website ID is required");
  }

  const form_data = {
    section_type: section_type,
    section_id: section_id,
    data: data,
  };

  const newFormId = Form.create({
    website_id: website_id,
    created_at: nowUtc,
    form_data: JSON.stringify(form_data),
  });

  if (!newFormId) {
    res.status(400);
    throw new Error("Unable to send form data");
  }
  res.status(201);
  responseHandler(res, {}, "Data Sent Successfully");
});

const fetchForms = asyncHandler(async function (req, res) {
  const websiteId = req.query.website_id;
  const userId = req.user?.id;
  u;
  if (!websiteId) {
    res.status(400);
    throw new Error("Website ID is required");
  }

  const hasAccess = await Website.checkUserAccess(websiteId, userId);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this website");
  }

  const limit = parseInt(req.query.per_page) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  const { forms, total } = await Form.findByWebsite(websiteId, limit, offset);

  const meta = {
    total: total,
    per_page: limit,
    current_page: page,
    last_page: Math.ceil(total / limit),
  };

  responseHandler(res, { forms, meta }, "Forms fetched successfully");
});

module.exports = {
  sendForm,
  fetchForms,
};
