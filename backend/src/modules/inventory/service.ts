import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { AppError } from '../../middleware/errorHandler.js';
import { normalizeInventoryText } from '../../domain/inventory/normalizer.js';
import { lookupFood } from '../../adapters/nutrition/foodLookup.js';
import { evaluateExpiry, type ExpiryThresholds } from '../../domain/expiry/expiryEvaluator.js';
import { recomputeWeights } from '../preferences/service.js';
import { logger } from '../../utils/logger.js';

export const BulkCreateInput = z.object({
  text: z.string().min(1).max(4000),
});
export type BulkCreateDto = z.infer<typeof BulkCreateInput>;

export const PatchInput = z.object({
  quantity: z.number().nonnegative().nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  consumed: z.boolean().optional(),
});
export type PatchDto = z.infer<typeof PatchInput>;

// 002 FR-010 — 유통기한/식품군 수정
export const ExpiryPatchInput = z.object({
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  food_group: z.string().max(30).nullable().optional(),
});
export type ExpiryPatchDto = z.infer<typeof ExpiryPatchInput>;

interface ItemRow extends RowDataPacket {
  id: number;
  raw_text: string;
  food_id: number | null;
  quantity: string | null;
  unit: string | null;
  food_group: string | null;
  expires_at: string | null;
  consumed: number;
  consumed_at: Date | null;
}

export interface InventoryItem {
  id: number;
  raw_text: string;
  normalized: string | null;
  food_id: number | null;
  quantity: number | null;
  unit: string | null;
  food_group: string | null;
  expires_at: string | null;
  consumed: boolean;
  warning?: string;
}

function toItem(r: ItemRow, normalized: string | null = null, warning?: string): InventoryItem {
  return {
    id: r.id,
    raw_text: r.raw_text,
    normalized,
    food_id: r.food_id,
    quantity: r.quantity == null ? null : Number(r.quantity),
    unit: r.unit,
    food_group: r.food_group,
    expires_at: r.expires_at,
    consumed: !!r.consumed,
    warning,
  };
}

export async function loadThresholds(): Promise<ExpiryThresholds> {
  interface ThRow extends RowDataPacket { food_group: string; imminent_days: number }
  const [rows] = await pool.query<ThRow[]>(
    'SELECT food_group, imminent_days FROM food_group_expiry_thresholds',
  );
  const m: ExpiryThresholds = {};
  for (const r of rows) m[r.food_group] = r.imminent_days;
  return m;
}

export async function bulkCreateFromText(userId: number, text: string): Promise<InventoryItem[]> {
  const items = normalizeInventoryText(text);
  if (items.length === 0) return [];

  const out: InventoryItem[] = [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const it of items) {
      // 만료된 재료는 자동 제외 (FR / Phase 5 정책의 일부 — MVP에서도 입력 방지)
      let warning: string | undefined;
      if (it.expiresAt) {
        const exp = new Date(it.expiresAt + 'T00:00:00Z').getTime();
        if (Number.isFinite(exp) && exp < Date.now() - 24 * 60 * 60 * 1000) {
          warning = 'expired — skipped';
          out.push({
            id: 0,
            raw_text: it.rawText,
            normalized: it.normalized ?? null,
            food_id: null,
            quantity: it.quantity ?? null,
            unit: it.unit ?? null,
            food_group: null,
            expires_at: it.expiresAt,
            consumed: false,
            warning,
          });
          continue;
        }
      }

      const match = await lookupFood(it.normalized ?? it.rawText);
      const [res] = await conn.query<ResultSetHeader>(
        `INSERT INTO ingredient_items (user_id, raw_text, food_id, quantity, unit, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          it.rawText,
          match.food_id,
          it.quantity ?? null,
          it.unit ?? null,
          it.expiresAt ?? null,
        ],
      );
      out.push({
        id: res.insertId,
        raw_text: it.rawText,
        normalized: match.food_id ? match.name_ko : (it.normalized ?? null),
        food_id: match.food_id,
        quantity: it.quantity ?? null,
        unit: it.unit ?? null,
        food_group: null,
        expires_at: it.expiresAt ?? null,
        consumed: false,
        warning: match.food_id ? undefined : 'unmatched — manual review',
      });
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return out;
}

export async function list(userId: number, opts: { onlyActive?: boolean } = {}): Promise<InventoryItem[]> {
  const where = ['user_id = ?'];
  const args: unknown[] = [userId];
  if (opts.onlyActive ?? true) where.push('consumed = FALSE');
  const [rows] = await pool.query<ItemRow[]>(
    `SELECT id, raw_text, food_id, quantity, unit, food_group, DATE_FORMAT(expires_at, '%Y-%m-%d') AS expires_at, consumed, consumed_at
       FROM ingredient_items
      WHERE ${where.join(' AND ')}
      ORDER BY (expires_at IS NULL), expires_at ASC, id DESC`,
    args,
  );
  // raw_text에서 날짜·수량을 떼어낸 깔끔한 표시 이름을 derive 한다.
  return rows.map((r) => {
    const parsed = normalizeInventoryText(r.raw_text)[0];
    return toItem(r, parsed?.normalized ?? null);
  });
}

export async function patch(userId: number, itemId: number, dto: PatchDto): Promise<InventoryItem> {
  const fields: string[] = [];
  const args: unknown[] = [];
  if (dto.quantity !== undefined) { fields.push('quantity = ?'); args.push(dto.quantity); }
  if (dto.unit !== undefined) { fields.push('unit = ?'); args.push(dto.unit); }
  if (dto.expires_at !== undefined) { fields.push('expires_at = ?'); args.push(dto.expires_at); }
  if (dto.consumed !== undefined) {
    fields.push('consumed = ?'); args.push(dto.consumed);
    fields.push('consumed_at = ?'); args.push(dto.consumed ? new Date() : null);
  }
  if (fields.length === 0) throw new AppError('NO_OP', 'no fields to update', 400);
  args.push(itemId, userId);

  const [res] = await pool.query<ResultSetHeader>(
    `UPDATE ingredient_items SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    args,
  );
  if (res.affectedRows === 0) throw new AppError('NOT_FOUND', 'item not found', 404);
  // 002 FR-013 — 소비 처리 시 소비 패턴 적재 + 선호 가중치 재계산
  if (dto.consumed === true) {
    await logConsumption(userId, itemId);
  }
  const [rows] = await pool.query<ItemRow[]>(
    `SELECT id, raw_text, food_id, quantity, unit, food_group, DATE_FORMAT(expires_at, '%Y-%m-%d') AS expires_at, consumed, consumed_at
       FROM ingredient_items WHERE id = ? AND user_id = ?`,
    [itemId, userId],
  );
  return toItem(rows[0]);
}

/** 002 FR-013 — 식재료 소비 이벤트 적재(소비 패턴) + 선호 가중치 재계산 트리거. */
async function logConsumption(userId: number, itemId: number): Promise<void> {
  interface FidRow extends RowDataPacket { food_id: number | null; quantity: string | null }
  const [rows] = await pool.query<FidRow[]>(
    'SELECT food_id, quantity FROM ingredient_items WHERE id = ? AND user_id = ?',
    [itemId, userId],
  );
  const r = rows[0];
  if (!r) return;
  await pool.query<ResultSetHeader>(
    `INSERT INTO consumption_records (user_id, food_id, ingredient_item_id, quantity)
     VALUES (?, ?, ?, ?)`,
    [userId, r.food_id, itemId, r.quantity == null ? null : Number(r.quantity)],
  );
  recomputeWeights(userId).catch((e) => logger.warn({ err: e, userId }, 'recomputeWeights failed (consume)'));
}

// 002 FR-011/012 — 임박/만료 식재료 조회 (식품군별 차등 임계)
export interface ExpiringOut {
  id: number;
  raw_text: string;
  food_group: string | null;
  expires_at: string | null;
  days_left: number;
  state: 'imminent' | 'expired';
}

export async function getExpiring(userId: number): Promise<{ imminent: ExpiringOut[]; expired: ExpiringOut[] }> {
  interface ExpRow extends RowDataPacket {
    id: number;
    raw_text: string;
    food_group: string | null;
    expires_at: string | null;
    days_left: number | null;
  }
  const [rows] = await pool.query<ExpRow[]>(
    `SELECT id, raw_text, food_group,
            DATE_FORMAT(expires_at, '%Y-%m-%d') AS expires_at,
            DATEDIFF(expires_at, CURDATE()) AS days_left
       FROM ingredient_items
      WHERE user_id = ? AND consumed = FALSE AND expires_at IS NOT NULL`,
    [userId],
  );
  const thresholds = await loadThresholds();
  const { imminent, expired } = evaluateExpiry(
    rows.map((r) => ({
      id: r.id,
      name: normalizeInventoryText(r.raw_text)[0]?.normalized ?? r.raw_text,
      food_group: r.food_group,
      days_left: r.days_left == null ? null : Number(r.days_left),
    })),
    thresholds,
  );
  const expMap = new Map(rows.map((r) => [r.id, r.expires_at]));
  const decorate = (e: { id: number; name: string; food_group: string | null; days_left: number; state: 'imminent' | 'expired' }): ExpiringOut => ({
    id: e.id,
    raw_text: e.name,
    food_group: e.food_group,
    expires_at: expMap.get(e.id) ?? null,
    days_left: e.days_left,
    state: e.state,
  });
  return { imminent: imminent.map(decorate), expired: expired.map(decorate) };
}

/** 002 FR-010 — 식재료 유통기한/식품군 수정. */
export async function updateExpiry(userId: number, itemId: number, dto: ExpiryPatchDto): Promise<InventoryItem> {
  const fields: string[] = [];
  const args: unknown[] = [];
  if (dto.expires_at !== undefined) { fields.push('expires_at = ?'); args.push(dto.expires_at); }
  if (dto.food_group !== undefined) { fields.push('food_group = ?'); args.push(dto.food_group); }
  if (fields.length === 0) throw new AppError('NO_OP', 'no fields to update', 400);
  args.push(itemId, userId);
  const [res] = await pool.query<ResultSetHeader>(
    `UPDATE ingredient_items SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    args,
  );
  if (res.affectedRows === 0) throw new AppError('NOT_FOUND', 'item not found', 404);
  const [rows] = await pool.query<ItemRow[]>(
    `SELECT id, raw_text, food_id, quantity, unit, food_group, DATE_FORMAT(expires_at, '%Y-%m-%d') AS expires_at, consumed, consumed_at
       FROM ingredient_items WHERE id = ? AND user_id = ?`,
    [itemId, userId],
  );
  return toItem(rows[0], normalizeInventoryText(rows[0].raw_text)[0]?.normalized ?? null);
}

export async function remove(userId: number, itemId: number): Promise<void> {
  const [res] = await pool.query<ResultSetHeader>(
    'DELETE FROM ingredient_items WHERE id = ? AND user_id = ?',
    [itemId, userId],
  );
  if (res.affectedRows === 0) throw new AppError('NOT_FOUND', 'item not found', 404);
}
