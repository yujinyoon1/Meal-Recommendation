-- R-7 (data-model §3.17) — SHA-256 캐시
CREATE TABLE recommendation_cache (
  cache_key         CHAR(64) NOT NULL,
  recommendation_id BIGINT UNSIGNED NOT NULL,
  expires_at        TIMESTAMP NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cache_key),
  KEY idx_rc_expires (expires_at),
  CONSTRAINT fk_rc_rec FOREIGN KEY (recommendation_id) REFERENCES recommendation_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
