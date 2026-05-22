import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { AppError } from '../../middleware/errorHandler.js';
import { normalizeInventoryText } from '../../domain/inventory/normalizer.js';
import { lookupFood } from '../../adapters/nutrition/foodLookup.js';

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

interface ItemRow extends RowDataPacket {
  id: number;
  raw_text: string;
  food_id: number | null;
  quantity: string | null;
  unit: string | null;
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
    expires_at: r.expires_at,
    consumed: !!r.consumed,
    warning,
  };
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
    `SELECT id, raw_text, food_id, quantity, unit, DATE_FORMAT(expires_at, '%Y-%m-%d') AS expires_at, consumed, consumed_at
       FROM ingredient_items
      WHERE ${where.join(' AND ')}
      ORDER BY (expires_at IS NULL), expires_at ASC, id DESC`,
    args,
  );
  return rows.map((r) => toItem(r));
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
  const [rows] = await pool.query<ItemRow[]>(
    `SELECT id, raw_text, food_id, quantity, unit, DATE_FORMAT(expires_at, '%Y-%m-%d') AS expires_at, consumed, consumed_at
       FROM ingredient_items WHERE id = ? AND user_id = ?`,
    [itemId, userId],
  );
  return toItem(rows[0]);
}

export async function remove(userId: number, itemId: number): Promise<void> {
  const [res] = await pool.query<ResultSetHeader>(
    'DELETE FROM ingredient_items WHERE id = ? AND user_id = ?',
    [itemId, userId],
  );
  if (res.affectedRows === 0) throw new AppError('NOT_FOUND', 'item not found', 404);
}
