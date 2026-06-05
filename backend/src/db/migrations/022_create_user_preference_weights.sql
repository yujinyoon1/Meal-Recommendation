-- 002 FR-001/003/004 (data-model §2.2) — 사용자별 선호 가중치(통계 집계 결과). 이벤트 시 UPSERT.
CREATE TABLE user_preference_weights (
  user_id      BIGINT UNSIGNED NOT NULL,
  dimension    VARCHAR(20) NOT NULL,
  key_ref      VARCHAR(80) NOT NULL,
  weight       DECIMAL(6,3) NOT NULL DEFAULT 0,
  confidence   DECIMAL(5,3) NOT NULL DEFAULT 0,
  sample_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, dimension, key_ref),
  KEY idx_upw_user_dim (user_id, dimension),
  CONSTRAINT fk_upw_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
