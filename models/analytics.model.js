const { db_connection } = require("../config/config.inc");

// All read queries use DATE_SUB(NOW(), INTERVAL days DAY) so the date range
// is always computed in the MySQL server's own timezone — never Node's UTC.
// This prevents the mismatch where data inserted at e.g. 23:58 WAT (UTC+1)
// falls outside a UTC-based BETWEEN range.

const Analytics = {

  // ─── WRITE: page_views ────────────────────────────────────────────────────
  trackPageView: async ({ website_id, page_id, visitor_id, session_id, ip_address, user_agent, referer_url, page_url, device_type, browser, os, country_code, city }) => {
    try {
      const [r] = await db_connection.execute(
        `INSERT INTO page_views (website_id, page_id, visitor_id, session_id, ip_address, user_agent, referer_url, page_url, device_type, browser, os, country_code, city)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [website_id, page_id ?? null, visitor_id, session_id ?? null, ip_address ?? null, user_agent ?? null, referer_url ?? null, page_url, device_type ?? null, browser ?? null, os ?? null, country_code ?? null, city ?? null],
      );
      return r.insertId;
    } catch (err) { console.error("[Analytics:trackPageView]", err.message); return null; }
  },

  updatePageViewDuration: async (website_id, visitor_id, session_id, page_url, duration) => {
    try {
      await db_connection.execute(
        `UPDATE page_views SET view_duration = ? WHERE website_id = ? AND visitor_id = ? AND session_id = ? AND page_url = ? ORDER BY created_at DESC LIMIT 1`,
        [duration, website_id, visitor_id, session_id, page_url],
      );
      return true;
    } catch (err) { console.error("[Analytics:updatePageViewDuration]", err.message); return false; }
  },

  // ─── WRITE: visitor_sessions ──────────────────────────────────────────────
  upsertVisitorSession: async ({ website_id, visitor_id, session_id, ip_address, user_agent, device_type, browser, os, country_code, city, entry_page }) => {
    try {
      await db_connection.execute(
        `INSERT INTO visitor_sessions (website_id, visitor_id, session_id, ip_address, user_agent, device_type, browser, os, country_code, city, entry_page)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE page_views = page_views + 1, last_activity = CURRENT_TIMESTAMP`,
        [website_id, visitor_id, session_id, ip_address ?? null, user_agent ?? null, device_type ?? null, browser ?? null, os ?? null, country_code ?? null, city ?? null, entry_page ?? null],
      );
      return true;
    } catch (err) { console.error("[Analytics:upsertVisitorSession]", err.message); return false; }
  },

  updateSessionExit: async (session_id, exit_page, duration) => {
    try {
      await db_connection.execute(
        `UPDATE visitor_sessions SET exit_page = ?, session_duration = ?, is_bounce = IF(page_views <= 1, 1, 0) WHERE session_id = ?`,
        [exit_page ?? null, duration ?? null, session_id],
      );
      return true;
    } catch (err) { console.error("[Analytics:updateSessionExit]", err.message); return false; }
  },

  // ─── WRITE: website_events ────────────────────────────────────────────────
  trackEvent: async ({ website_id, visitor_id, session_id, event_name, event_category, event_label, event_value, page_url, element_selector, event_data }) => {
    try {
      const [r] = await db_connection.execute(
        `INSERT INTO website_events (website_id, visitor_id, session_id, event_name, event_category, event_label, event_value, page_url, element_selector, event_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [website_id, visitor_id, session_id ?? null, event_name, event_category ?? null, event_label ?? null, event_value ?? null, page_url ?? null, element_selector ?? null, event_data ? JSON.stringify(event_data) : null],
      );
      return r.insertId;
    } catch (err) { console.error("[Analytics:trackEvent]", err.message); return null; }
  },

  // ─── WRITE: performance_metrics ───────────────────────────────────────────
  trackPerformance: async ({ website_id, page_id, visitor_id, page_url, load_time, dom_interactive, first_paint, first_contentful_paint, time_to_interactive }) => {
    try {
      const [r] = await db_connection.execute(
        `INSERT INTO performance_metrics (website_id, page_id, visitor_id, page_url, load_time, dom_interactive, first_paint, first_contentful_paint, time_to_interactive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [website_id, page_id ?? null, visitor_id ?? null, page_url, load_time ?? null, dom_interactive ?? null, first_paint ?? null, first_contentful_paint ?? null, time_to_interactive ?? null],
      );
      return r.insertId;
    } catch (err) { console.error("[Analytics:trackPerformance]", err.message); return null; }
  },

  // ─── WRITE: form_analytics ────────────────────────────────────────────────
  trackFormAnalytics: async ({ website_id, form_id, visitor_id, form_name, start_time, completion_time, is_completed, field_interactions }) => {
    try {
      const [r] = await db_connection.execute(
        `INSERT INTO form_analytics (website_id, form_id, visitor_id, form_name, start_time, completion_time, is_completed, field_interactions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [website_id, form_id ?? null, visitor_id, form_name ?? null, start_time ?? null, completion_time ?? null, is_completed ? 1 : 0, field_interactions ? JSON.stringify(field_interactions) : null],
      );
      return r.insertId;
    } catch (err) { console.error("[Analytics:trackFormAnalytics]", err.message); return null; }
  },

  // ─── WRITE: geoip_cache ───────────────────────────────────────────────────
  getGeoCache: async (ip_address) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT * FROM geoip_cache WHERE ip_address = ? LIMIT 1`, [ip_address],
      );
      return rows[0] || null;
    } catch (err) { console.error("[Analytics:getGeoCache]", err.message); return null; }
  },

  upsertGeoCache: async ({ ip_address, country_code, country_name, city, latitude, longitude, timezone, isp, organization }) => {
    try {
      const cc = country_code ?? null, cn = country_name ?? null, ct = city ?? null;
      await db_connection.execute(
        `INSERT INTO geoip_cache (ip_address, country_code, country_name, city, latitude, longitude, timezone, isp, organization, query_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           country_code = ?, country_name = ?, city = ?,
           last_queried = CURRENT_TIMESTAMP, query_count = query_count + 1`,
        [ip_address, cc, cn, ct, latitude ?? null, longitude ?? null, timezone ?? null, isp ?? null, organization ?? null, cc, cn, ct],
      );
      return true;
    } catch (err) { console.error("[Analytics:upsertGeoCache]", err.message, "| ip:", ip_address); return false; }
  },

  // ─── WRITE: daily_stats rollup ────────────────────────────────────────────
  upsertDailyStats: async (website_id, stat_date) => {
    try {
      const dateStr = stat_date || new Date().toISOString().slice(0, 10);
      const nextDay = new Date(dateStr);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDateStr = nextDay.toISOString().slice(0, 10);

      const [[pvRow]] = await db_connection.execute(
        `SELECT COUNT(*) AS page_views, COUNT(DISTINCT visitor_id) AS unique_visitors, COUNT(DISTINCT session_id) AS sessions
         FROM page_views WHERE website_id = ? AND DATE(created_at) = ?`,
        [website_id, dateStr],
      );
      const [[vsRow]] = await db_connection.execute(
        `SELECT
           COUNT(DISTINCT CASE WHEN vs.visitor_id NOT IN (
             SELECT DISTINCT visitor_id FROM visitor_sessions WHERE website_id = ? AND DATE(created_at) < ?
           ) THEN vs.visitor_id END) AS new_visitors,
           COUNT(DISTINCT CASE WHEN vs.visitor_id IN (
             SELECT DISTINCT visitor_id FROM visitor_sessions WHERE website_id = ? AND DATE(created_at) < ?
           ) THEN vs.visitor_id END) AS returning_visitors,
           AVG(session_duration) AS avg_session_duration,
           AVG(page_views) AS avg_page_views_per_session,
           AVG(is_bounce) * 100 AS bounce_rate
         FROM visitor_sessions vs WHERE website_id = ? AND DATE(created_at) = ?`,
        [website_id, dateStr, website_id, dateStr, website_id, dateStr],
      );
      const [[faRow]] = await db_connection.execute(
        `SELECT COUNT(*) AS form_submissions, AVG(is_completed) * 100 AS form_completion_rate
         FROM form_analytics WHERE website_id = ? AND DATE(created_at) = ?`,
        [website_id, dateStr],
      );

      await db_connection.execute(
        `INSERT INTO daily_stats (website_id, stat_date, page_views, unique_visitors, new_visitors, returning_visitors, sessions, bounce_rate, avg_session_duration, avg_page_views_per_session, form_submissions, form_completion_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           page_views = VALUES(page_views), unique_visitors = VALUES(unique_visitors),
           new_visitors = VALUES(new_visitors), returning_visitors = VALUES(returning_visitors),
           sessions = VALUES(sessions), bounce_rate = VALUES(bounce_rate),
           avg_session_duration = VALUES(avg_session_duration),
           avg_page_views_per_session = VALUES(avg_page_views_per_session),
           form_submissions = VALUES(form_submissions),
           form_completion_rate = VALUES(form_completion_rate),
           updated_at = CURRENT_TIMESTAMP`,
        [
          website_id, dateStr,
          pvRow.page_views || 0, pvRow.unique_visitors || 0,
          vsRow.new_visitors || 0, vsRow.returning_visitors || 0, pvRow.sessions || 0,
          vsRow.bounce_rate || 0, vsRow.avg_session_duration || 0, vsRow.avg_page_views_per_session || 0,
          faRow.form_submissions || 0, faRow.form_completion_rate || 0,
        ],
      );
      return true;
    } catch (err) { console.error("[Analytics:upsertDailyStats]", err.message); return false; }
  },

  // ─── READ helpers ─────────────────────────────────────────────────────────
  // All reads accept `days` (integer) and build the range inside MySQL:
  //   created_at >= DATE_SUB(NOW(), INTERVAL days DAY)
  // This ensures the range always matches the server timezone where rows were inserted.

  getDailyStats: async (website_id, days) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT * FROM daily_stats
         WHERE website_id = ? AND stat_date >= DATE(DATE_SUB(NOW(), INTERVAL ? DAY))
         ORDER BY stat_date ASC`,
        [website_id, days],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getDailyStats]", err.message); return []; }
  },

  getPageViewTimeSeries: async (website_id, days) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT DATE(created_at) AS date,
           COUNT(*) AS total_views,
           COUNT(DISTINCT visitor_id) AS unique_visitors,
           COUNT(DISTINCT session_id) AS sessions
         FROM page_views
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY DATE(created_at) ORDER BY date ASC`,
        [website_id, days],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getPageViewTimeSeries]", err.message); return []; }
  },

  getTopPages: async (website_id, days, limit = 10) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT page_url, COUNT(*) AS views,
           COUNT(DISTINCT visitor_id) AS unique_visitors,
           AVG(view_duration) AS avg_duration
         FROM page_views
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY page_url ORDER BY views DESC LIMIT ?`,
        [website_id, days, limit],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getTopPages]", err.message); return []; }
  },

  getTopReferrers: async (website_id, days, limit = 10) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT COALESCE(referer_url, 'Direct') AS referer_url,
           COUNT(*) AS visits,
           COUNT(DISTINCT visitor_id) AS unique_visitors
         FROM page_views
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY referer_url ORDER BY visits DESC LIMIT ?`,
        [website_id, days, limit],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getTopReferrers]", err.message); return []; }
  },

  getDeviceBreakdown: async (website_id, days) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT device_type, COUNT(*) AS count, COUNT(DISTINCT visitor_id) AS unique_visitors
         FROM page_views
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY device_type ORDER BY count DESC`,
        [website_id, days],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getDeviceBreakdown]", err.message); return []; }
  },

  getBrowserBreakdown: async (website_id, days) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT browser, COUNT(*) AS count
         FROM page_views
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND browser IS NOT NULL
         GROUP BY browser ORDER BY count DESC LIMIT 8`,
        [website_id, days],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getBrowserBreakdown]", err.message); return []; }
  },

  getOsBreakdown: async (website_id, days) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT os, COUNT(*) AS count
         FROM page_views
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND os IS NOT NULL
         GROUP BY os ORDER BY count DESC LIMIT 8`,
        [website_id, days],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getOsBreakdown]", err.message); return []; }
  },

  getCountryBreakdown: async (website_id, days, limit = 10) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT country_code, city, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS unique_visitors
         FROM page_views
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND country_code IS NOT NULL
         GROUP BY country_code, city ORDER BY views DESC LIMIT ?`,
        [website_id, days, limit],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getCountryBreakdown]", err.message); return []; }
  },

  getVisitorSessionStats: async (website_id, days) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT
           COUNT(*) AS total_sessions,
           COUNT(DISTINCT visitor_id) AS unique_visitors,
           SUM(is_bounce) AS bounced_sessions,
           AVG(session_duration) AS avg_duration,
           AVG(page_views) AS avg_pages,
           COUNT(CASE WHEN is_bounce = 0 THEN 1 END) AS engaged_sessions
         FROM visitor_sessions
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [website_id, days],
      );
      return rows[0] || null;
    } catch (err) { console.error("[Analytics:getVisitorSessionStats]", err.message); return null; }
  },

  getTopEntryPages: async (website_id, days, limit = 10) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT entry_page, COUNT(*) AS entries
         FROM visitor_sessions
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND entry_page IS NOT NULL
         GROUP BY entry_page ORDER BY entries DESC LIMIT ?`,
        [website_id, days, limit],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getTopEntryPages]", err.message); return []; }
  },

  getTopExitPages: async (website_id, days, limit = 10) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT exit_page, COUNT(*) AS exits
         FROM visitor_sessions
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND exit_page IS NOT NULL
         GROUP BY exit_page ORDER BY exits DESC LIMIT ?`,
        [website_id, days, limit],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getTopExitPages]", err.message); return []; }
  },

  getNewVsReturning: async (website_id, days) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT SUM(new_visitors) AS new_visitors, SUM(returning_visitors) AS returning_visitors
         FROM daily_stats
         WHERE website_id = ? AND stat_date >= DATE(DATE_SUB(NOW(), INTERVAL ? DAY))`,
        [website_id, days],
      );
      return rows[0] || { new_visitors: 0, returning_visitors: 0 };
    } catch (err) { console.error("[Analytics:getNewVsReturning]", err.message); return { new_visitors: 0, returning_visitors: 0 }; }
  },

  getTopEvents: async (website_id, days, limit = 10) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT event_name, event_category, event_label,
           COUNT(*) AS count, COUNT(DISTINCT visitor_id) AS unique_visitors
         FROM website_events
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY event_name, event_category, event_label ORDER BY count DESC LIMIT ?`,
        [website_id, days, limit],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getTopEvents]", err.message); return []; }
  },

  getEventTimeSeries: async (website_id, days) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT DATE(created_at) AS date, COUNT(*) AS count
         FROM website_events
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY DATE(created_at) ORDER BY date ASC`,
        [website_id, days],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getEventTimeSeries]", err.message); return []; }
  },

  getAvgPerformance: async (website_id, days) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT
           AVG(load_time) AS avg_load_time,
           MIN(load_time) AS min_load_time,
           MAX(load_time) AS max_load_time,
           AVG(dom_interactive) AS avg_dom_interactive,
           AVG(first_paint) AS avg_fp,
           AVG(first_contentful_paint) AS avg_fcp,
           AVG(time_to_interactive) AS avg_tti,
           COUNT(*) AS sample_count
         FROM performance_metrics
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [website_id, days],
      );
      return rows[0] || null;
    } catch (err) { console.error("[Analytics:getAvgPerformance]", err.message); return null; }
  },

  getPerformanceByPage: async (website_id, days, limit = 10) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT page_url,
           AVG(load_time) AS avg_load_time,
           AVG(first_contentful_paint) AS avg_fcp,
           AVG(time_to_interactive) AS avg_tti,
           COUNT(*) AS samples
         FROM performance_metrics
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY page_url ORDER BY avg_load_time DESC LIMIT ?`,
        [website_id, days, limit],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getPerformanceByPage]", err.message); return []; }
  },

  getFormStats: async (website_id, days) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT form_name, form_id,
           COUNT(*) AS total_starts,
           SUM(is_completed) AS completions,
           AVG(is_completed) * 100 AS completion_rate,
           AVG(TIMESTAMPDIFF(SECOND, start_time, completion_time)) AS avg_completion_seconds
         FROM form_analytics
         WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY form_name, form_id ORDER BY total_starts DESC`,
        [website_id, days],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getFormStats]", err.message); return []; }
  },

  getGeoStats: async (website_id, days) => {
    try {
      const [rows] = await db_connection.execute(
        `SELECT g.country_code, g.country_name, g.city,
           COUNT(pv.id) AS views,
           COUNT(DISTINCT pv.visitor_id) AS unique_visitors
         FROM page_views pv
         LEFT JOIN geoip_cache g ON pv.ip_address = g.ip_address
         WHERE pv.website_id = ? AND pv.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY g.country_code, g.country_name, g.city
         ORDER BY views DESC LIMIT 20`,
        [website_id, days],
      );
      return rows;
    } catch (err) { console.error("[Analytics:getGeoStats]", err.message); return []; }
  },

  getSummaryTotals: async (website_id, days) => {
    try {
      const [[pv]] = await db_connection.execute(
        `SELECT COUNT(*) AS total_views, COUNT(DISTINCT visitor_id) AS unique_visitors, COUNT(DISTINCT session_id) AS sessions
         FROM page_views WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [website_id, days],
      );
      const [[vs]] = await db_connection.execute(
        `SELECT AVG(session_duration) AS avg_duration, AVG(is_bounce) * 100 AS bounce_rate, AVG(page_views) AS avg_pages
         FROM visitor_sessions WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [website_id, days],
      );
      const [[ev]] = await db_connection.execute(
        `SELECT COUNT(*) AS total_events FROM website_events WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [website_id, days],
      );
      const [[fa]] = await db_connection.execute(
        `SELECT COUNT(*) AS form_starts, SUM(is_completed) AS form_completions
         FROM form_analytics WHERE website_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [website_id, days],
      );
      return {
        total_views:      pv.total_views      || 0,
        unique_visitors:  pv.unique_visitors  || 0,
        sessions:         pv.sessions         || 0,
        avg_duration:     vs.avg_duration     || 0,
        bounce_rate:      vs.bounce_rate      || 0,
        avg_pages:        vs.avg_pages        || 0,
        total_events:     ev.total_events     || 0,
        form_starts:      fa.form_starts      || 0,
        form_completions: fa.form_completions || 0,
      };
    } catch (err) { console.error("[Analytics:getSummaryTotals]", err.message); return null; }
  },

  getSummaryTotalsPrevPeriod: async (website_id, days) => {
    try {
      const [[pv]] = await db_connection.execute(
        `SELECT COUNT(*) AS total_views, COUNT(DISTINCT visitor_id) AS unique_visitors, COUNT(DISTINCT session_id) AS sessions
         FROM page_views
         WHERE website_id = ?
           AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
           AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [website_id, days * 2, days],
      );
      const [[vs]] = await db_connection.execute(
        `SELECT AVG(is_bounce) * 100 AS bounce_rate
         FROM visitor_sessions
         WHERE website_id = ?
           AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
           AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [website_id, days * 2, days],
      );
      return {
        total_views:     pv.total_views     || 0,
        unique_visitors: pv.unique_visitors || 0,
        sessions:        pv.sessions        || 0,
        bounce_rate:     vs.bounce_rate     || 0,
      };
    } catch (err) { console.error("[Analytics:getSummaryTotalsPrevPeriod]", err.message); return null; }
  },
};

module.exports = Analytics;