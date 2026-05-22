-- FR-018, FR-019 (data-model §3.16)
CREATE TABLE feedbacks (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recommendation_id BIGINT UNSIGNED NOT NULL,
  user_id           BIGINT UNSIGNED NOT NULL,
  rating            TINYINT UNSIGNED NOT NULL,
  comment           VARCHAR(1000) NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_fb_rating CHECK (rating BETWEEN 1 AND 5),
  KEY idx_fb_user_ts (user_id, created_at DESC),
  KEY idx_fb_rec (recommendation_id),
  CONSTRAINT fk_fb_rec  FOREIGN KEY (recommendation_id) REFERENCES recommendation_requests (id) ON DELETE CASCADE,
  CONSTRAINT fk_fb_user FOREIGN KEY (user_id)           REFERENCES users (id)                   ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
