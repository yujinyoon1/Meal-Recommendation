-- FR-024, FR-025 (data-model §3.5)
CREATE TABLE consent_records (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  consent_type  ENUM('terms','privacy','sensitive_health','marketing','third_party_share') NOT NULL,
  granted       BOOLEAN NOT NULL,
  version       VARCHAR(20) NOT NULL DEFAULT 'v1',
  granted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at    TIMESTAMP NULL,
  evidence_ip   VARBINARY(16) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cr_user_type_ts (user_id, consent_type, granted_at DESC),
  CONSTRAINT fk_cr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
