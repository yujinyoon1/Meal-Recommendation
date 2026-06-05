/**
 * 002 FR-001/003/004 — 선호 가중치 서비스.
 *
 * 이벤트 소스(결정적):
 *  - recommendation_edits: exclude/replace → 대상 기피(-), substitute 대체물 → 선호(+)
 *  - consumption_records: 소비한 식재료 → 약한 선호(+)
 *
 * weightCalculator(순수)로 집계 후 user_preference_weights 에 UPSERT.
 * 추가 LLM 호출 없음(비용 0).
 */
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import {
  calculateWeights,
  type PreferenceEvent,
  type PreferenceWeight,
} from '../../domain/preferences/weightCalculator.js';

/** 콜드스타트 판정: 기여 이벤트 총합이 이 미만이면 학습 미적용으로 간주. */
const COLD_START_MIN_EVENTS = 3;

interface EditRow extends RowDataPacket {
  action: 'replace' | 'exclude' | 'substitute';
  target_type: string;
  target_ref: string;
  replacement_ref: string | null;
  age_days: number;
}
interface ConsumeRow extends RowDataPacket {
  name: string;
  age_days: number;
}

async function loadEvents(userId: number): Promise<PreferenceEvent[]> {
  const events: PreferenceEvent[] = [];

  const [edits] = await pool.query<EditRow[]>(
    `SELECT action, target_type, target_ref, replacement_ref,
            DATEDIFF(NOW(), created_at) AS age_days
       FROM recommendation_edits
      WHERE user_id = ?`,
    [userId],
  );
  for (const e of edits) {
    if (e.target_type !== 'ingredient') continue; // 1차: 재료 차원만 학습
    const age = Number(e.age_days) || 0;
    if (e.action === 'exclude' || e.action === 'replace') {
      events.push({ dimension: 'ingredient', key_ref: e.target_ref, signal: -1, ageInDays: age });
    } else if (e.action === 'substitute') {
      events.push({ dimension: 'ingredient', key_ref: e.target_ref, signal: -0.5, ageInDays: age });
    }
    if (e.replacement_ref) {
      events.push({ dimension: 'ingredient', key_ref: e.replacement_ref, signal: 0.5, ageInDays: age });
    }
  }

  const [consumed] = await pool.query<ConsumeRow[]>(
    `SELECT COALESCE(f.name_ko, ii.raw_text) AS name,
            DATEDIFF(NOW(), cr.consumed_at) AS age_days
       FROM consumption_records cr
       LEFT JOIN foods f ON f.id = cr.food_id
       LEFT JOIN ingredient_items ii ON ii.id = cr.ingredient_item_id
      WHERE cr.user_id = ?`,
    [userId],
  );
  for (const c of consumed) {
    const name = (c.name ?? '').trim();
    if (!name) continue;
    events.push({ dimension: 'ingredient', key_ref: name, signal: 0.3, ageInDays: Number(c.age_days) || 0 });
  }

  return events;
}

/** 사용자 선호 가중치 재계산 → UPSERT. 이벤트(피드백 수정·소비·재사용) 발생 시 호출. */
export async function recomputeWeights(userId: number): Promise<number> {
  const events = await loadEvents(userId);
  const weights = calculateWeights(events);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // 전량 재계산이므로 기존 가중치를 지우고 다시 적재(일관성).
    await conn.query('DELETE FROM user_preference_weights WHERE user_id = ?', [userId]);
    for (const w of weights) {
      await conn.query<ResultSetHeader>(
        `INSERT INTO user_preference_weights
           (user_id, dimension, key_ref, weight, confidence, sample_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, w.dimension, w.key_ref, w.weight, w.confidence, w.sample_count],
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return weights.length;
}

interface WeightRow extends RowDataPacket {
  dimension: PreferenceWeight['dimension'];
  key_ref: string;
  weight: string;
  confidence: string;
  sample_count: number;
}

export interface PreferenceSnapshot {
  cold_start: boolean;
  weights: PreferenceWeight[];
}

/** 현재 가중치 + 콜드스타트 여부 조회 (FR-003 근거 표시/FR-004). */
export async function getWeights(userId: number): Promise<PreferenceSnapshot> {
  const [rows] = await pool.query<WeightRow[]>(
    `SELECT dimension, key_ref, weight, confidence, sample_count
       FROM user_preference_weights
      WHERE user_id = ?
      ORDER BY ABS(weight) DESC`,
    [userId],
  );
  const weights: PreferenceWeight[] = rows.map((r) => ({
    dimension: r.dimension,
    key_ref: r.key_ref,
    weight: Number(r.weight),
    confidence: Number(r.confidence),
    sample_count: r.sample_count,
  }));
  const totalSamples = weights.reduce((s, w) => s + w.sample_count, 0);
  return { cold_start: totalSamples < COLD_START_MIN_EVENTS, weights };
}
