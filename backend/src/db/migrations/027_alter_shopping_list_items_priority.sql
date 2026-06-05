-- 002 FR-035/036 (data-model §1.2) — 장보기 우선순위 점수. (reason 컬럼은 001에 이미 존재)
ALTER TABLE shopping_list_items
  ADD COLUMN priority_score SMALLINT NOT NULL DEFAULT 0 AFTER reason,
  ADD KEY idx_sli_rec_priority (recommendation_id, priority_score)
