const asyncHandler = require("express-async-handler");
const https = require("https");
const http = require("http");
const { responseHandler } = require("../middleware/responseHandler.js");
const Analytics = require("../models/analytics.model.js");
const Website = require("../models/website.model.js");
const UAParser = require("ua-parser-js");

const getDateRange = (range) => {
  const to = new Date();
  const from = new Date();
  switch (range) {
    case "7d":  from.setDate(from.getDate() - 7);  break;
    case "30d": from.setDate(from.getDate() - 30); break;
    case "90d": from.setDate(from.getDate() - 90); break;
    default:    from.setDate(from.getDate() - 30);
  }
  return {
    from: from.toISOString().slice(0, 19).replace("T", " "),
    to:   to.toISOString().slice(0, 19).replace("T", " "),
  };
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
  return { browser: result.browser.name || null, os: result.os.name || null, device_type };
};

const isPrivateIP = (ip) => {
  if (!ip) return true;
  const clean = ip.replace("::ffff:", "");
  return (
    clean === "127.0.0.1" || clean === "::1" || clean === "localhost" ||
    clean.startsWith("10.") ||
    clean.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(clean)
  );
};

// Free GeoIP — ip-api.com, no key, 45 req/min on HTTP
const lookupGeoIP = (ip) => {
  return new Promise((resolve) => {
    const req = http.get(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon,timezone,isp,org`,
      { timeout: 3000 },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            const d = JSON.parse(body);
            if (d.status === "success") {
              resolve({
                country_code: d.countryCode || null,
                country_name: d.country || null,
                city: d.city || null,
                latitude: d.lat || null,
                longitude: d.lon || null,
                timezone: d.timezone || null,
                isp: d.isp || null,
                organization: d.org || null,
              });
            } else {
              resolve(null);
            }
          } catch { resolve(null); }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
};

const resolveGeo = async (ip_address) => {
  if (!ip_address || isPrivateIP(ip_address)) {
    return { country_code: null, city: null };
  }
  const cached = await Analytics.getGeoCache(ip_address);
  if (cached) return { country_code: cached.country_code, city: cached.city };

  const geo = await lookupGeoIP(ip_address);
  if (geo) {
    Analytics.upsertGeoCache({ ip_address, ...geo }).catch(() => {});
    return { country_code: geo.country_code, city: geo.city };
  }
  return { country_code: null, city: null };
};

const checkAccess = async (userId, website_id) => {
  const websites = await Website.findForUser(userId);
  return websites?.find((w) => String(w.id) === String(website_id)) || null;
};

// ─── PUBLIC TRACKING ─────────────────────────────────────────────────────────

const trackPageView = asyncHandler(async (req, res) => {
  const { website_id, page_id, visitor_id, session_id, referer_url, page_url } = req.body;
  if (!website_id || !visitor_id || !page_url) {
    res.status(400);
    throw new Error("website_id, visitor_id and page_url are required");
  }

  const ip_address =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress || null;

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
    website_id, visitor_id, session_id: session_id ?? null, event_name,
    event_category: event_category ?? null, event_label: event_label ?? null,
    event_value: event_value ?? null, page_url: page_url ?? null,
    element_selector: element_selector ?? null, event_data: event_data ?? null,
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

  const { from, to } = getDateRange(range);

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
    Analytics.getSummaryTotals(website_id, from, to),
    Analytics.getSummaryTotalsPrevPeriod(website_id, from, to),
    Analytics.getPageViewTimeSeries(website_id, from, to),
    Analytics.getTopPages(website_id, from, to),
    Analytics.getTopReferrers(website_id, from, to),
    Analytics.getDeviceBreakdown(website_id, from, to),
    Analytics.getBrowserBreakdown(website_id, from, to),
    Analytics.getOsBreakdown(website_id, from, to),
    Analytics.getCountryBreakdown(website_id, from, to),
    Analytics.getGeoStats(website_id, from, to),
    Analytics.getVisitorSessionStats(website_id, from, to),
    Analytics.getTopEntryPages(website_id, from, to),
    Analytics.getTopExitPages(website_id, from, to),
    Analytics.getNewVsReturning(website_id, from, to),
    Analytics.getTopEvents(website_id, from, to),
    Analytics.getEventTimeSeries(website_id, from, to),
    Analytics.getAvgPerformance(website_id, from, to),
    Analytics.getPerformanceByPage(website_id, from, to),
    Analytics.getFormStats(website_id, from, to),
    Analytics.getDailyStats(website_id, from, to),
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