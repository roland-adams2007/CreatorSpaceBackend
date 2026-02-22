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

