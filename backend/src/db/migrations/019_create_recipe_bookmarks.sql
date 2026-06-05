-- 레시피 북마크: 사용자가 추천받은 레시피를 저장해두고 다시 보기.
-- recipe 행은 추천마다 새로 생성되므로, 북마크는 사용자가 본 그 레시피 인스턴스를 가리킨다.
-- 추천 이력 삭제 시 연관 recipe 가 삭제되면 북마크도 함께 정리되도록 ON DELETE CASCADE.
CREATE TABLE recipe_bookmarks (
  user_id     BIGINT UNSIGNED NOT NULL,
  recipe_id   BIGINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, recipe_id),
  KEY idx_rb_user_created (user_id, created_at),
  CONSTRAINT fk_rb_user   FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE CASCADE,
  CONSTRAINT fk_rb_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
