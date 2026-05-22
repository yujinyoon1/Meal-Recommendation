/**
 * LLM 어댑터 인터페이스 — 모든 LLM 호출은 이 인터페이스 뒤에서만 수행.
 * (CLAUDE.md 규칙 #3)
 */

export type LlmRole = 'system' | 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmCompleteOptions {
  /** 타임아웃 (ms). 기본은 env.LLM_TIMEOUT_MS */
  timeoutMs?: number;
  /** JSON 모드 강제 — 응답이 JSON으로 시작해야 한다는 약속 */
  jsonMode?: boolean;
  /** 헬스체크 호출(짧은 응답 허용) */
  healthCheck?: boolean;
  /** Temperature override */
  temperature?: number;
}

export interface LlmResult {
  /** 모델이 반환한 텍스트(또는 JSON 문자열) */
  text: string;
  /** 실제 모델 이름 (감사 로깅용) */
  model: string;
  /** 호출 latency (ms) */
  latencyMs: number;
}

export interface LlmAdapter {
  readonly provider: string;
  complete(messages: LlmMessage[], opts?: LlmCompleteOptions): Promise<LlmResult>;
}

export class LlmError extends Error {
  constructor(
    public code: 'TIMEOUT' | 'PROVIDER_ERROR' | 'INVALID_RESPONSE' | 'CONFIG_ERROR',
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}
