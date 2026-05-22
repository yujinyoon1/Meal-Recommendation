-- FR-001, FR-025 (data-model §3.1)
CREATE TABLE users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email           VARCHAR(255)    NOT NULL,
  password_hash   VARCHAR(255)    NOT NULL,
  display_name    VARCHAR(100)    NULL,
  status          ENUM('active','suspended','withdrawn') NOT NULL DEFAULT 'active',
  deleted_at      TIMESTAMP       NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_status_deleted (status, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
