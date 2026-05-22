/**
 * OpenAI Chat Completions 어댑터.
 * - timeout 기본 25s
 * - 재시도는 호출 측(orchestrator)에서 수행
 *
 * TODO(외부 의존): OpenAI SDK 의존성 미설치. .env에 LLM_API_KEY 설정 후
 *                  `npm i openai` 추가하여 활성화. 현재는 fetch 직호출로 작성.
 */
import { env } from '../../config/env.js';
import { LlmAdapter, LlmCompleteOptions, LlmError, LlmMessage, LlmResult } from './types.js';

export class OpenAiAdapter implements LlmAdapter {
  readonly provider = 'openai';

  async complete(messages: LlmMessage[], opts: LlmCompleteOptions = {}): Promise<LlmResult> {
    if (!env.LLM_API_KEY) {
      throw new LlmError('CONFIG_ERROR', 'LLM_API_KEY is not set');
    }
    const timeoutMs = opts.timeoutMs ?? env.LLM_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();
    try {
      const body: Record<string, unknown> = {
        model: env.LLM_MODEL,
        messages,
        temperature: opts.temperature ?? 0.4,
      };
      if (opts.jsonMode) body.response_format = { type: 'json_object' };

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${env.LLM_API_KEY}`,
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new LlmError('PROVIDER_ERROR', `openai ${resp.status}: ${text.slice(0, 256)}`);
      }
      const json = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        model?: string;
      };
      const text = json.choices?.[0]?.message?.content;
      if (typeof text !== 'string') {
        throw new LlmError('INVALID_RESPONSE', 'openai: empty choices');
      }
      return { text, model: json.model ?? env.LLM_MODEL, latencyMs: Date.now() - start };
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        throw new LlmError('TIMEOUT', `openai timeout ${timeoutMs}ms`, e);
      }
      if (e instanceof LlmError) throw e;
      throw new LlmError('PROVIDER_ERROR', (e as Error).message, e);
    } finally {
      clearTimeout(timer);
    }
  }
}
