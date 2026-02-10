const Website = require("../models/website.model");

function baseSlugify(text) {
  if (!text) return "";

  return text
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateUniqueSlug(name) {
  try {
    let baseSlug = baseSlugify(name);

    if (!baseSlug || baseSlug.length < 3) {
      baseSlug = "site";
    }

    let slug = baseSlug;
    let counter = 2;
    const maxAttempts = 100;

    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      try {
        const existing = await Website.findBySlug(slug);

        if (!existing) {
          return slug;
        }

        slug = `${baseSlug}-${counter}`;
        counter++;
      } catch (dbError) {
        return `${baseSlug}-${Date.now()}`;
      }
    }

    return `${baseSlug}-${Date.now()}`;
  } catch (error) {
    return `site-${Date.now()}`;
  }
}

module.exports = generateUniqueSlug;
