const asyncHandler = require("express-async-handler");
const { responseHandler } = require("../middleware/responseHandler.js");
const Analytics = require("../models/analytics.model.js");
const Website = require("../models/website.model.js");
const UAParser = require("ua-parser-js");

// ─── GeoIP ────────────────────────────────────────────────────────────────────
// Strategy: try geoip-lite first (offline, fast, no rate limit).
// If not installed, fall back to ip-api.com via axios.

let geoipLite = null;
try {
  geoipLite = require("geoip-lite");
} catch {
  // not installed — will use HTTP fallback
}

const isPrivateIP = (ip) => {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, "");
  return (
    clean === "127.0.0.1" ||
    clean === "::1" ||
    clean === "localhost" ||
    clean.startsWith("10.") ||
    clean.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(clean)
  );
};

const lookupViaHTTP = async (ip) => {
  try {
    // Use axios — already a project dependency
    const axios = require("axios");
    const { data } = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon,timezone,isp,org`,
      { timeout: 4000 }
    );
    if (data?.status === "success") {
      return {
        country_code:  data.countryCode  || null,
        country_name:  data.country      || null,
        city:          data.city         || null,
        latitude:      data.lat          || null,
        longitude:     data.lon          || null,
        timezone:      data.timezone     || null,
        isp:           data.isp          || null,
        organization:  data.org          || null,
      };
    }
  } catch (err) {
    console.warn("[GeoIP] HTTP lookup failed:", err.message);
  }
  return null;
};

const lookupViaGeoipLite = (ip) => {
  try {
    const geo = geoipLite.lookup(ip);
    if (!geo) return null;
    return {
      country_code:  geo.country   || null,
      country_name:  geo.country   || null, // geoip-lite doesn't give full name
      city:          geo.city      || null,
      latitude:      geo.ll?.[0]   || null,
      longitude:     geo.ll?.[1]   || null,
      timezone:      geo.timezone  || null,
      isp:           null,
      organization:  null,
    };
  } catch (err) {
    console.warn("[GeoIP] geoip-lite lookup failed:", err.message);
    return null;
  }
};

const resolveGeo = async (ip_address) => {
  if (!ip_address || isPrivateIP(ip_address)) {
    return { country_code: null, city: null };
  }

  // 1. Check cache first
  const cached = await Analytics.getGeoCache(ip_address);
  if (cached) {
    return { country_code: cached.country_code, city: cached.city };
  }

  // 2. Try geoip-lite (offline, instant)
  let geo = null;
  if (geoipLite) {
    geo = lookupViaGeoipLite(ip_address);
  }

  // 3. Fall back to ip-api.com HTTP
  if (!geo) {
    geo = await lookupViaHTTP(ip_address);
  }

  // 4. Write to cache (even if null, write a placeholder so we don't hammer the API)
  const toCache = geo || {
    country_code: null, country_name: null, city: null,
    latitude: null, longitude: null, timezone: null, isp: null, organization: null,
  };

  const saved = await Analytics.upsertGeoCache({ ip_address, ...toCache });
  if (!saved) {
    console.error("[GeoIP] Failed to write to geoip_cache for IP:", ip_address);
  }

  return { country_code: toCache.country_code, city: toCache.city };
};

// ─── UA Parser ────────────────────────────────────────────────────────────────

const getDateRange = (range) => {
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  // Use DATE_SUB on the DB side so timezone always matches where data was written
  return { days };
};

const parseUA = (uaString) => {
  const parser = new UAParser(uaString || "");
  const result = parser.getResult();
  const raw = (uaString || "").toLowerCase();
  const device_type =
    result.device.type === "mobile" ? "mobile" :
    result.device.type === "tablet" ? "tablet" :
    raw.includes("bot") || raw.includes("crawler") || raw.includes("spider") ? "bot" :
    "desktop";
  return {
    browser:     result.browser.name || null,
    os:          result.os.name      || null,
    device_type,
  };
};

const checkAccess = async (userId, website_id) => {
  const websites = await Website.findForUser(userId);
  return websites?.find((w) => String(w.id) === String(website_id)) || null;
};

const getClientIP = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.socket?.remoteAddress ||
  null;

// ─── PUBLIC TRACKING ─────────────────────────────────────────────────────────

const trackPageView = asyncHandler(async (req, res) => {
  const { website_id, page_id, visitor_id, session_id, referer_url, page_url } = req.body;
  if (!website_id || !visitor_id || !page_url) {
    res.status(400);
    throw new Error("website_id, visitor_id and page_url are required");
  }

  const ip_address = getClientIP(req);
  const user_agent = req.headers["user-agent"] || "";
  const { browser, os, device_type } = parseUA(user_agent);
  const { country_code, city } = await resolveGeo(ip_address);

  const viewId = await Analytics.trackPageView({
    website_id, page_id: page_id ?? null, visitor_id,
    session_id: session_id ?? null, ip_address, user_agent,
    referer_url: referer_url ?? null, page_url,
    device_type, browser, os, country_code, city,
  });

  if (session_id) {
    await Analytics.upsertVisitorSession({
      website_id, visitor_id, session_id, ip_address, user_agent,
      device_type, browser, os, country_code, city, entry_page: page_url,
    });
  }

  Analytics.upsertDailyStats(website_id, new Date().toISOString().slice(0, 10)).catch(() => {});

  res.status(201);
  responseHandler(res, { id: viewId }, "Page view tracked");
});

const trackEvent = asyncHandler(async (req, res) => {
  const {
    website_id, visitor_id, session_id, event_name,
    event_category, event_label, event_value,
    page_url, element_selector, event_data,
  } = req.body;

  if (!website_id || !visitor_id || !event_name) {
    res.status(400);
    throw new Error("website_id, visitor_id and event_name are required");
  }

  const eventId = await Analytics.trackEvent({
    website_id, visitor_id, session_id: session_id ?? null,
    event_name, event_category: event_category ?? null,
    event_label: event_label ?? null, event_value: event_value ?? null,
    page_url: page_url ?? null, element_selector: element_selector ?? null,
    event_data: event_data ?? null,
  });

  res.status(201);
  responseHandler(res, { id: eventId }, "Event tracked");
});

const trackPerformance = asyncHandler(async (req, res) => {
  const {
    website_id, page_id, visitor_id, page_url,
    load_time, dom_interactive, first_paint,
    first_contentful_paint, time_to_interactive,
  } = req.body;

  if (!website_id || !page_url) {
    res.status(400);
    throw new Error("website_id and page_url are required");
  }

  const metricId = await Analytics.trackPerformance({
    website_id, page_id: page_id ?? null, visitor_id: visitor_id ?? null, page_url,
    load_time: load_time ?? null, dom_interactive: dom_interactive ?? null,
    first_paint: first_paint ?? null,
    first_contentful_paint: first_contentful_paint ?? null,
    time_to_interactive: time_to_interactive ?? null,
  });

  res.status(201);
  responseHandler(res, { id: metricId }, "Performance tracked");
});

const trackFormAnalytics = asyncHandler(async (req, res) => {
  const {
    website_id, form_id, visitor_id, form_name,
    start_time, completion_time, is_completed, field_interactions,
  } = req.body;

  if (!website_id || !visitor_id) {
    res.status(400);
    throw new Error("website_id and visitor_id are required");
  }

  const id = await Analytics.trackFormAnalytics({
    website_id, form_id: form_id ?? null, visitor_id,
    form_name: form_name ?? null, start_time: start_time ?? null,
    completion_time: completion_time ?? null,
    is_completed: is_completed ?? false,
    field_interactions: field_interactions ?? null,
  });

  Analytics.upsertDailyStats(website_id, new Date().toISOString().slice(0, 10)).catch(() => {});

  res.status(201);
  responseHandler(res, { id }, "Form analytics tracked");
});

const updateSessionExit = asyncHandler(async (req, res) => {
  const { session_id, exit_page, duration, website_id, visitor_id, page_url } = req.body;

  if (!session_id) {
    res.status(400);
    throw new Error("session_id is required");
  }

  await Analytics.updateSessionExit(session_id, exit_page ?? null, duration ?? null);

  if (website_id && visitor_id && page_url && duration) {
    await Analytics.updatePageViewDuration(website_id, visitor_id, session_id, page_url, duration);
  }

  if (website_id) {
    Analytics.upsertDailyStats(website_id, new Date().toISOString().slice(0, 10)).catch(() => {});
  }

  res.status(200);
  responseHandler(res, {}, "Session updated");
});

// ─── DASHBOARD READ ───────────────────────────────────────────────────────────

const getOverview = asyncHandler(async (req, res) => {
  const { website_id } = req.params;
  const { range = "30d" } = req.query;

  if (!await checkAccess(req.user?.id, website_id)) {
    res.status(403);
    throw new Error("Access denied");
  }

  const { days } = getDateRange(range);

  const [
    summary, prevSummary,
    pageViewTimeSeries,
    topPages, topReferrers,
    deviceBreakdown, browserBreakdown, osBreakdown,
    countryBreakdown, geoStats,
    sessionStats, topEntryPages, topExitPages, newVsReturning,
    topEvents, eventTimeSeries,
    performance, perfByPage,
    formStats,
    dailyStats,
  ] = await Promise.all([
    Analytics.getSummaryTotals(website_id, days),
    Analytics.getSummaryTotalsPrevPeriod(website_id, days),
    Analytics.getPageViewTimeSeries(website_id, days),
    Analytics.getTopPages(website_id, days),
    Analytics.getTopReferrers(website_id, days),
    Analytics.getDeviceBreakdown(website_id, days),
    Analytics.getBrowserBreakdown(website_id, days),
    Analytics.getOsBreakdown(website_id, days),
    Analytics.getCountryBreakdown(website_id, days),
    Analytics.getGeoStats(website_id, days),
    Analytics.getVisitorSessionStats(website_id, days),
    Analytics.getTopEntryPages(website_id, days),
    Analytics.getTopExitPages(website_id, days),
    Analytics.getNewVsReturning(website_id, days),
    Analytics.getTopEvents(website_id, days),
    Analytics.getEventTimeSeries(website_id, days),
    Analytics.getAvgPerformance(website_id, days),
    Analytics.getPerformanceByPage(website_id, days),
    Analytics.getFormStats(website_id, days),
    Analytics.getDailyStats(website_id, days),
  ]);

  res.status(200);
  responseHandler(res, {
    summary, prevSummary,
    pageViewTimeSeries,
    topPages, topReferrers,
    deviceBreakdown, browserBreakdown, osBreakdown,
    countryBreakdown, geoStats,
    sessionStats, topEntryPages, topExitPages, newVsReturning,
    topEvents, eventTimeSeries,
    performance, perfByPage,
    formStats,
    dailyStats,
  }, "Analytics overview");
});

module.exports = {
  trackPageView,
  trackEvent,
  trackPerformance,
  trackFormAnalytics,
  updateSessionExit,
  getOverview,
};