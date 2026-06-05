-- 002 FR-002 (data-model §2.3) — 추천 수정 이력(구조화). 학습 신호.
CREATE TABLE recommendation_edits (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recommendation_id BIGINT UNSIGNED NOT NULL,
  user_id           BIGINT UNSIGNED NOT NULL,
  action            ENUM('replace','exclude','substitute') NOT NULL,
  target_type       VARCHAR(20) NOT NULL,
  target_ref        VARCHAR(120) NOT NULL,
  replacement_ref   VARCHAR(120) NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_re_user_ts (user_id, created_at),
  KEY idx_re_rec (recommendation_id),
  CONSTRAINT fk_re_rec  FOREIGN KEY (recommendation_id) REFERENCES recommendation_requests (id) ON DELETE CASCADE,
  CONSTRAINT fk_re_user FOREIGN KEY (user_id)           REFERENCES users (id)                   ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
