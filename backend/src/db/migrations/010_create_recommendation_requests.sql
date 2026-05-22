-- FR-010~014 (data-model §3.10)
CREATE TABLE recommendation_requests (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id                  BIGINT UNSIGNED NOT NULL,
  request_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  profile_snapshot_json    JSON NULL,
  inventory_snapshot_json  JSON NULL,
  prompt_version           VARCHAR(20) NULL,
  llm_provider             VARCHAR(40) NULL,
  llm_model                VARCHAR(80) NULL,
  llm_latency_ms           INT UNSIGNED NULL,
  status                   ENUM('pending','generated','validated','rejected','failed') NOT NULL DEFAULT 'pending',
  failure_reason           VARCHAR(255) NULL,
  created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rr_user_req (user_id, request_at DESC),
  CONSTRAINT fk_rr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
