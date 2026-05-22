import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

// AES-256-GCM, key derived from base64 32 bytes env var
function getKey(): Buffer {
  const key = Buffer.from(env.APP_ENCRYPTION_KEY, 'base64');
  if (key.length !== 32) {
    throw new Error(`APP_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length})`);
  }
  return key;
}

// 출력 포맷: [iv(12) | authTag(16) | ciphertext]  → 단일 Buffer (VARBINARY 컬럼 저장)
export function encrypt(plainJson: unknown): Buffer {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(plainJson), 'utf-8');
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
}

export function decrypt<T = unknown>(blob: Buffer): T {
  const key = getKey();
  if (blob.length < 12 + 16 + 1) {
    throw new Error('cipher blob too short');
  }
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(plaintext.toString('utf-8')) as T;
}
