CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  fname VARCHAR(100) NULL,
  lname VARCHAR(100) NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  email_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_is_active (is_active),
  INDEX idx_users_verified (email_verified_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  session_id CHAR(36) NOT NULL UNIQUE,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  device_label VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NULL,
  revoked_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_revoked (revoked_at),
  INDEX idx_sessions_last_seen (last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  session_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  replaced_by_token_hash CHAR(64) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES user_sessions(session_id) ON DELETE CASCADE,
  INDEX idx_refresh_user (user_id),
  INDEX idx_refresh_session (session_id),
  INDEX idx_refresh_expires (expires_at),
  INDEX idx_refresh_revoked (revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS email_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  type VARCHAR(100) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  is_used TINYINT(1) NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_email_tokens_user (user_id),
  INDEX idx_email_tokens_type (type),
  INDEX idx_email_tokens_used (is_used),
  INDEX idx_email_tokens_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NULL,
  ip_address VARCHAR(45) NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attempts_email (email),
  INDEX idx_attempts_ip (ip_address),
  INDEX idx_attempts_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS theme_templates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NULL,
  preview_image VARCHAR(255) NULL,
  base_config_json JSON NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_theme_templates_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS websites (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NULL,
  website_theme_id BIGINT UNSIGNED NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_websites_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS website_themes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  website_id BIGINT UNSIGNED NOT NULL,
  template_id BIGINT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL,
  config_json JSON NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES theme_templates(id) ON DELETE SET NULL,

  UNIQUE KEY uq_website_theme_slug (website_id, slug),
  INDEX idx_website_themes_website (website_id),
  INDEX idx_website_themes_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS website_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  website_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('owner','admin','editor','viewer') NOT NULL DEFAULT 'editor',
  invited_by BIGINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_website_user (website_id, user_id),
  INDEX idx_website_users_user (user_id),
  INDEX idx_website_users_website (website_id),
  INDEX idx_website_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  website_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL,
  content_json JSON NOT NULL,
  is_home TINYINT(1) NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  UNIQUE KEY uq_page_slug (website_id, slug),
  INDEX idx_pages_website (website_id),
  INDEX idx_pages_home (website_id, is_home)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS website_assets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  website_id BIGINT UNSIGNED NOT NULL,
  file_uuid CHAR(36) NOT NULL,
  file_original_name VARCHAR(255) NULL,
  file_path VARCHAR(500) NULL,
  file_name VARCHAR(255) NULL,
  file_size INT UNSIGNED NULL,
  mime_type VARCHAR(100) NULL,
  extension VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  INDEX idx_assets_website (website_id),
  INDEX idx_assets_file_uuid (file_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS forms (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  website_id BIGINT UNSIGNED NOT NULL,
  form_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_website_id (website_id),
    FOREIGN KEY (website_id)
    REFERENCES websites(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS team_invitations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  website_id BIGINT UNSIGNED NOT NULL,
  email VARCHAR(190) NOT NULL,
  invited_by BIGINT UNSIGNED NOT NULL,
  role ENUM('owner','admin','editor','viewer') NOT NULL DEFAULT 'editor',
  token_hash CHAR(64) NOT NULL UNIQUE,
  status ENUM('pending','accepted','declined','expired') NOT NULL DEFAULT 'pending',
  expires_at DATETIME NOT NULL,
  accepted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
  
  UNIQUE KEY uq_pending_invitation (website_id, email, status),
  INDEX idx_team_inv_website (website_id),
  INDEX idx_team_inv_email (email),
  INDEX idx_team_inv_token (token_hash),
  INDEX idx_team_inv_status (status),
  INDEX idx_team_inv_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Page views tracking
CREATE TABLE IF NOT EXISTS page_views (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  website_id BIGINT UNSIGNED NOT NULL,
  page_id BIGINT UNSIGNED NULL,
  visitor_id CHAR(36) NOT NULL,
  session_id CHAR(36) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  referer_url VARCHAR(500) NULL,
  page_url VARCHAR(500) NOT NULL,
  view_duration INT UNSIGNED NULL, -- in seconds
  device_type ENUM('desktop','mobile','tablet','bot') NULL,
  browser VARCHAR(100) NULL,
  os VARCHAR(100) NULL,
  country_code CHAR(2) NULL,
  city VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE SET NULL,
  
  INDEX idx_page_views_website (website_id),
  INDEX idx_page_views_page (page_id),
  INDEX idx_page_views_visitor (visitor_id),
  INDEX idx_page_views_session (session_id),
  INDEX idx_page_views_date (created_at),
  INDEX idx_page_views_country (country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Visitor sessions
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  website_id BIGINT UNSIGNED NOT NULL,
  visitor_id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL UNIQUE,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  device_type ENUM('desktop','mobile','tablet','bot') NULL,
  browser VARCHAR(100) NULL,
  os VARCHAR(100) NULL,
  country_code CHAR(2) NULL,
  city VARCHAR(100) NULL,
  entry_page VARCHAR(500) NULL,
  exit_page VARCHAR(500) NULL,
  page_views INT UNSIGNED DEFAULT 1,
  session_duration INT UNSIGNED NULL, -- in seconds
  is_bounce TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  
  INDEX idx_visitor_sessions_website (website_id),
  INDEX idx_visitor_sessions_visitor (visitor_id),
  INDEX idx_visitor_sessions_session (session_id),
  INDEX idx_visitor_sessions_last_activity (last_activity),
  INDEX idx_visitor_sessions_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Form submissions analytics
CREATE TABLE IF NOT EXISTS form_analytics (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  website_id BIGINT UNSIGNED NOT NULL,
  form_id BIGINT UNSIGNED NULL,
  visitor_id CHAR(36) NOT NULL,
  form_name VARCHAR(150) NULL,
  start_time DATETIME NULL,
  completion_time DATETIME NULL,
  is_completed TINYINT(1) DEFAULT 0,
  field_interactions JSON NULL, -- track which fields were interacted with
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE SET NULL,
  
  INDEX idx_form_analytics_website (website_id),
  INDEX idx_form_analytics_form (form_id),
  INDEX idx_form_analytics_visitor (visitor_id),
  INDEX idx_form_analytics_completed (is_completed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Website events (custom events you want to track)
CREATE TABLE IF NOT EXISTS website_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  website_id BIGINT UNSIGNED NOT NULL,
  visitor_id CHAR(36) NOT NULL,
  session_id CHAR(36) NULL,
  event_name VARCHAR(100) NOT NULL,
  event_category VARCHAR(100) NULL,
  event_label VARCHAR(255) NULL,
  event_value INT NULL,
  page_url VARCHAR(500) NULL,
  element_selector VARCHAR(255) NULL,
  event_data JSON NULL, -- additional custom data
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  
  INDEX idx_website_events_website (website_id),
  INDEX idx_website_events_visitor (visitor_id),
  INDEX idx_website_events_name (event_name),
  INDEX idx_website_events_category (event_category),
  INDEX idx_website_events_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  website_id BIGINT UNSIGNED NOT NULL,
  page_id BIGINT UNSIGNED NULL,
  visitor_id CHAR(36) NULL,
  page_url VARCHAR(500) NOT NULL,
  load_time INT UNSIGNED NULL, -- in milliseconds
  dom_interactive INT UNSIGNED NULL,
  first_paint INT UNSIGNED NULL,
  first_contentful_paint INT UNSIGNED NULL,
  time_to_interactive INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE SET NULL,
  
  INDEX idx_performance_website (website_id),
  INDEX idx_performance_page (page_id),
  INDEX idx_performance_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- GeoIP cache (to avoid repeated lookups)
CREATE TABLE IF NOT EXISTS geoip_cache (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  country_code CHAR(2) NULL,
  country_name VARCHAR(100) NULL,
  city VARCHAR(100) NULL,
  latitude DECIMAL(10,8) NULL,
  longitude DECIMAL(11,8) NULL,
  timezone VARCHAR(50) NULL,
  isp VARCHAR(200) NULL,
  organization VARCHAR(200) NULL,
  last_queried TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  query_count INT UNSIGNED DEFAULT 1,
  
  INDEX idx_geoip_ip (ip_address),
  INDEX idx_geoip_country (country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Daily rollup tables for faster reporting
CREATE TABLE IF NOT EXISTS daily_stats (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  website_id BIGINT UNSIGNED NOT NULL,
  stat_date DATE NOT NULL,
  page_views INT UNSIGNED DEFAULT 0,
  unique_visitors INT UNSIGNED DEFAULT 0,
  new_visitors INT UNSIGNED DEFAULT 0,
  returning_visitors INT UNSIGNED DEFAULT 0,
  sessions INT UNSIGNED DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  avg_session_duration DECIMAL(10,2) DEFAULT 0,
  avg_page_views_per_session DECIMAL(5,2) DEFAULT 0,
  form_submissions INT UNSIGNED DEFAULT 0,
  form_completion_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
  UNIQUE KEY uq_daily_stats (website_id, stat_date),
  
  INDEX idx_daily_stats_website (website_id),
  INDEX idx_daily_stats_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;