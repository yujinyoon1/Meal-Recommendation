-- 002 FR-030/031/038 (data-model §2.6/2.7) — 수동 건강 기록 + 리포트 캐시. 민감지표 암호화.
CREATE TABLE health_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  logged_at   DATE NOT NULL,
  weight_kg   DECIMAL(5,2) NULL,
  metrics_enc VARBINARY(2048) NULL,
  note        VARCHAR(300) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hl_user_date (user_id, logged_at),
  CONSTRAINT fk_hl_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE health_reports (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  period_type  ENUM('week','month') NOT NULL,
  period_start DATE NOT NULL,
  summary_json JSON NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hr_user_period (user_id, period_type, period_start),
  CONSTRAINT fk_hr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
