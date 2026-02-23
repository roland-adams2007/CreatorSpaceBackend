const asyncHandler = require("express-async-handler");
const { responseHandler } = require("../middleware/responseHandler.js");
const { db_connection } = require("../config/config.inc");
const Theme = require("../models/theme.model.js");
const Website = require("../models/website.model.js");
const generateUniqueSlug = require("../utils/slugify.js");

const DEFAULT_THEME_CONFIG = {
  header: {
    type: "default",
    props: {
      logo: "",
      menu: [],
      ctaButton: { text: "", link: "" },
    },
  },
  footer: {
    type: "default",
    props: {
      columns: [],
      copyright: "",
    },
  },
  layout: {
    sections: [],
  },
  theme: {
    colors: {
      primary: "#6366f1",
      secondary: "#8b5cf6",
      accent: "#ec4899",
      background: "#ffffff",
      text: "#111827",
    },
    fonts: {
      heading: "Inter",
      body: "Inter",
    },
  },
};

const getThemes = asyncHandler(async function (req, res) {
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

  const websiteId = parseInt(website_id);

  if (isNaN(websiteId)) {
    res.status(400);
    throw new Error("Invalid Website ID");
  }

  const hasAccess = await Website.checkUserAccess(websiteId, userId);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this website");
  }

  const themes = await Theme.findForWebsite(websiteId, userId);

  res.status(200);
  responseHandler(res, { themes }, "Themes retrieved");
});

const getTheme = asyncHandler(async function (req, res) {
  const { themeSlug } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const theme = await Theme.findBySlug(themeSlug);

  if (!theme) {
    res.status(404);
    throw new Error("Theme not found");
  }

  const hasAccess = await Theme.checkUserAccess(theme.id, userId);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this theme");
  }

  res.status(200);
  responseHandler(res, { theme }, "Theme retrieved");
});

const createTheme = asyncHandler(async function (req, res) {
  const { website_id, template_id, name, config_json } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  if (!website_id) {
    res.status(400);
    throw new Error("Website ID is required");
  }

  if (!name || name.trim().length < 2) {
    res.status(400);
    throw new Error("Theme name is required");
  }

  const hasAccess = await Website.checkUserAccess(website_id, userId);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this website");
  }

  const nowUtc = new Date().toISOString().slice(0, 19).replace("T", " ");

  // Generate unique slug for the website
  const slug = await generateUniqueSlug(name, async (slug) => {
    const existing = await Theme.findBySlugAndWebsite(slug, website_id);
    return existing;
  });

  // If template_id is provided, load template config
  let themeConfig = config_json;

  // if coming from template
  if (template_id && !config_json) {
    const template = await Theme.getTemplateById(template_id);
    if (template?.base_config_json) {
      themeConfig =
        typeof template.base_config_json === "string"
          ? JSON.parse(template.base_config_json)
          : template.base_config_json;
    }
  }

  // fallback
  if (!themeConfig) {
    themeConfig = DEFAULT_THEME_CONFIG;
  }

  // VERY IMPORTANT
  if (typeof themeConfig === "string") {
    themeConfig = JSON.parse(themeConfig);
  }
  const themeId = await Theme.create({
    website_id,
    template_id: template_id || null,
    name: name.trim(),
    slug,
    config_json: themeConfig,
    created_at: nowUtc,
    updated_at: nowUtc,
  });

  if (!themeId) {
    res.status(500);
    throw new Error("Failed to create theme");
  }

  const theme = await Theme.findById(themeId);

  res.status(201);
  responseHandler(res, { theme }, "Theme created successfully");
});

const updateTheme = asyncHandler(async function (req, res) {
  const { themeId } = req.params;
  const { name, config_json } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const theme = await Theme.findById(themeId);

  if (!theme) {
    res.status(404);
    throw new Error("Theme not found");
  }

  const hasAccess = await Theme.checkUserAccess(themeId, userId);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this theme");
  }

  const nowUtc = new Date().toISOString().slice(0, 19).replace("T", " ");

  const updateData = {
    name: name?.trim(),
    updated_at: nowUtc,
  };

  if (config_json !== undefined) {
    updateData.config_json = config_json;
  }

  const updated = await Theme.update(themeId, updateData);

  if (!updated) {
    res.status(500);
    throw new Error("Failed to update theme");
  }

  const updatedTheme = await Theme.findById(themeId);

  res.status(200);
  responseHandler(res, { theme: updatedTheme }, "Theme updated successfully");
});

const deleteTheme = asyncHandler(async function (req, res) {
  const { themeId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const theme = await Theme.findById(themeId);

  if (!theme) {
    res.status(404);
    throw new Error("Theme not found");
  }

  const hasAccess = await Theme.checkUserAccess(themeId, userId);
  if (!hasAccess) {
    res.status(403);
    throw new Error("Access denied to this theme");
  }

  try {
    const deleted = await Theme.delete(themeId);

    if (!deleted) {
      res.status(500);
      throw new Error("Failed to delete theme");
    }

    res.status(200);
    responseHandler(res, null, "Theme deleted successfully");
  } catch (error) {
    if (
      error.message.includes("Cannot delete theme that is currently active")
    ) {
      res.status(400);
      throw error;
    }
    throw error;
  }
});

const setActiveTheme = asyncHandler(async function (req, res) {
  const { themeId } = req.params;
  const { website_id } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  if (!website_id) {
    res.status(400);
    throw new Error("Website ID is required");
  }

  const hasWebsiteAccess = await Website.checkUserAccess(website_id, userId);
  if (!hasWebsiteAccess) {
    res.status(403);
    throw new Error("Access denied to this website");
  }

  const theme = await Theme.findById(themeId);
  if (!theme) {
    res.status(404);
    throw new Error("Theme not found");
  }

  // Verify theme belongs to this website
  if (parseInt(theme.website_id) !== parseInt(website_id)) {
    res.status(403);
    throw new Error("Theme does not belong to this website");
  }

  try {
    const nowUtc = new Date().toISOString().slice(0, 19).replace("T", " ");
    await db_connection.execute(
      `UPDATE websites SET website_theme_id = ?, updated_at = ? WHERE id = ?`,
      [themeId, nowUtc, website_id],
    );

    await db_connection.execute(
      `UPDATE website_themes SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE website_id = ?`,
      [themeId, website_id],
    );

    res.status(200);
    responseHandler(res, null, "Active theme set successfully");
  } catch (error) {
    console.error("Set active theme error:", error);
    res.status(500);
    throw new Error("Failed to set active theme");
  }
});

// New controller to get available templates
const getTemplates = asyncHandler(async function (req, res) {
  const templates = await Theme.getTemplates();
  res.status(200);
  responseHandler(res, { templates }, "Templates retrieved");
});

const getPublicTheme = asyncHandler(async function (req, res) {
  const { themeSlug } = req.params;

  // Get theme by slug with website info to check if website is published
  const [themes] = await db_connection.execute(
    `SELECT wt.*, w.is_published as website_published, w.slug as website_slug
     FROM website_themes wt
     JOIN websites w ON wt.website_id = w.id
     WHERE wt.slug = ?`,
    [themeSlug],
  );

  if (!themes || themes.length === 0) {
    res.status(404);
    throw new Error("Theme not found");
  }

  const theme = themes[0];
  const isPreview = req.query.preview === "true";

  // Check if website is published (unless preview mode)
  if (!isPreview && theme.website_published != 1) {
    res.status(403);
    throw new Error("Website for this theme is not published");
  }

  // Parse config_json if it's a string
  if (theme.config_json && typeof theme.config_json === "string") {
    try {
      theme.config_json = JSON.parse(theme.config_json);
    } catch (e) {
      console.error("Failed to parse theme config_json:", e);
    }
  }

  // Remove internal fields
  delete theme.website_published;

  res.status(200);
  responseHandler(res, { theme }, "Theme retrieved");
});

const getPublicWebsiteInfo = asyncHandler(async function (req, res) {
  const { websiteSlug } = req.params;

  const [websites] = await db_connection.execute(
    `SELECT id, name, slug, is_published, website_theme_id, created_at, updated_at 
     FROM websites 
     WHERE slug = ?`,
    [websiteSlug],
  );

  if (!websites || websites.length === 0) {
    res.status(404);
    throw new Error("Website not found");
  }

  const website = websites[0];
  const isPreview = req.query.preview === "true";

  if (!isPreview && website.is_published != 1) {
    res.status(403);
    throw new Error("This website is not published");
  }

  const publicWebsiteInfo = {
    id: website.id,
    name: website.name,
    slug: website.slug,
    is_published: website.is_published == 1,
    website_theme_id: website.website_theme_id,
    created_at: website.created_at,
    updated_at: website.updated_at,
  };

  res.status(200);
  responseHandler(
    res,
    { website: publicWebsiteInfo },
    "Website info retrieved",
  );
});

const getPublicActiveTheme = asyncHandler(async function (req, res) {
  const { websiteSlug } = req.params;

  // First get the website to check if it's published
  const [websites] = await db_connection.execute(
    `SELECT id, name, slug, is_published 
     FROM websites 
     WHERE slug = ?`,
    [websiteSlug],
  );

  if (!websites || websites.length === 0) {
    res.status(404);
    throw new Error("Website not found");
  }

  const website = websites[0];

  // Check if website is published (unless preview mode)
  const isPreview = req.query.preview === "true";

  if (!isPreview && website.is_published != 1) {
    res.status(403);
    throw new Error("This website is not published");
  }

  // Get the active theme for the website
  const [themes] = await db_connection.execute(
    `SELECT wt.*, tt.name as template_name, tt.slug as template_slug
     FROM website_themes wt
     LEFT JOIN theme_templates tt ON wt.template_id = tt.id
     WHERE wt.website_id = ? AND wt.is_active = 1`,
    [website.id],
  );

  if (!themes || themes.length === 0) {
    res.status(404);
    throw new Error("No active theme found for this website");
  }

  const activeTheme = themes[0];

  // Parse config_json if it's a string
  if (activeTheme.config_json && typeof activeTheme.config_json === "string") {
    try {
      activeTheme.config_json = JSON.parse(activeTheme.config_json);
    } catch (e) {
      console.error("Failed to parse theme config_json:", e);
    }
  }

  res.status(200);
  responseHandler(res, { theme: activeTheme }, "Active theme retrieved");
});

// Get all themes for a website (public)
const getPublicWebsiteThemes = asyncHandler(async function (req, res) {
  const { websiteSlug } = req.params;

  // First verify website exists and is published
  const [websites] = await db_connection.execute(
    `SELECT id, is_published FROM websites WHERE slug = ?`,
    [websiteSlug],
  );

  if (!websites || websites.length === 0) {
    res.status(404);
    throw new Error("Website not found");
  }

  const website = websites[0];
  const isPreview = req.query.preview === "true";

  // Only return themes if website is published (unless preview mode)
  if (!isPreview && website.is_published != 1) {
    res.status(403);
    throw new Error("Website is not published");
  }

  // Get all themes for this website
  const [themes] = await db_connection.execute(
    `SELECT wt.id, wt.name, wt.slug, wt.template_id, wt.is_active, 
            wt.created_at, wt.updated_at, tt.name as template_name
     FROM website_themes wt
     LEFT JOIN theme_templates tt ON wt.template_id = tt.id
     WHERE wt.website_id = ?
     ORDER BY wt.is_active DESC, wt.created_at DESC`,
    [website.id],
  );

  res.status(200);
  responseHandler(res, { themes }, "Website themes retrieved");
});

// Get theme by slug for a specific website
const getPublicWebsiteTheme = asyncHandler(async function (req, res) {
  const { websiteSlug, themeSlug } = req.params;

  // First verify website exists and is published
  const [websites] = await db_connection.execute(
    `SELECT id, is_published FROM websites WHERE slug = ?`,
    [websiteSlug],
  );

  if (!websites || websites.length === 0) {
    res.status(404);
    throw new Error("Website not found");
  }

  const website = websites[0];
  const isPreview = req.query.preview === "true";

  if (!isPreview && website.is_published != 1) {
    res.status(403);
    throw new Error("Website is not published");
  }

  // Get the specific theme
  const [themes] = await db_connection.execute(
    `SELECT wt.*, tt.name as template_name
     FROM website_themes wt
     LEFT JOIN theme_templates tt ON wt.template_id = tt.id
     WHERE wt.website_id = ? AND wt.slug = ?`,
    [website.id, themeSlug],
  );

  if (!themes || themes.length === 0) {
    res.status(404);
    throw new Error("Theme not found");
  }

  const theme = themes[0];

  // Parse config_json if it's a string
  if (theme.config_json && typeof theme.config_json === "string") {
    try {
      theme.config_json = JSON.parse(theme.config_json);
    } catch (e) {
      console.error("Failed to parse theme config_json:", e);
    }
  }

  res.status(200);
  responseHandler(res, { theme }, "Theme retrieved");
});

// Get all published templates (public)
const getPublicTemplates = asyncHandler(async function (req, res) {
  const [templates] = await db_connection.execute(
    `SELECT id, name, slug, description, preview_image, base_config_json, created_at
     FROM theme_templates
     WHERE is_active = 1
     ORDER BY name ASC`,
  );

  // Parse base_config_json for each template
  templates.forEach((template) => {
    if (
      template.base_config_json &&
      typeof template.base_config_json === "string"
    ) {
      try {
        template.base_config_json = JSON.parse(template.base_config_json);
      } catch (e) {
        console.error("Failed to parse template base_config_json:", e);
      }
    }
  });

  res.status(200);
  responseHandler(res, { templates }, "Templates retrieved");
});

module.exports = {
  getThemes,
  getTheme,
  createTheme,
  updateTheme,
  deleteTheme,
  setActiveTheme,
  getTemplates,
  getPublicTheme,
  getPublicWebsiteInfo,
  getPublicActiveTheme,
  getPublicWebsiteThemes,
};
