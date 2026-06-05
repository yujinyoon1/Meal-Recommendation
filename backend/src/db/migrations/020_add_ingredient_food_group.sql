-- 002 FR-010/012 (data-model §1.1) — 식재료 식품군 분류 (식품군별 임박 차등 판정용)
ALTER TABLE ingredient_items
  ADD COLUMN food_group VARCHAR(30) NULL AFTER unit,
  ADD KEY idx_ii_user_group_exp (user_id, food_group, expires_at)
