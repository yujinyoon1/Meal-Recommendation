-- FR-026 (data-model §3.18)
CREATE TABLE audit_logs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id   BIGINT UNSIGNED NULL,
  action          VARCHAR(80)  NOT NULL,
  target_user_id  BIGINT UNSIGNED NULL,
  target_table    VARCHAR(80)  NULL,
  target_id       BIGINT UNSIGNED NULL,
  metadata_json   JSON NULL,
  ip              VARBINARY(16) NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_al_target_ts (target_user_id, created_at DESC),
  KEY idx_al_action_ts (action, created_at DESC),
  CONSTRAINT fk_al_actor  FOREIGN KEY (actor_user_id)  REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_al_target FOREIGN KEY (target_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
