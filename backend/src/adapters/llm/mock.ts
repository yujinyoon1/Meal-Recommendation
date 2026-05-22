/**
 * 결정적 Mock LLM 어댑터 — 테스트/로컬 개발용.
 * 입력 메시지를 SHA-256 → 시드로 사용해 동일 입력에 동일 출력을 보장.
 */
import { createHash } from 'node:crypto';
import { LlmAdapter, LlmCompleteOptions, LlmMessage, LlmResult } from './types.js';

const SAMPLE_RECIPE = {
  recipes: [
    {
      name: '두부 계란 양파볶음',
      description: '단백질 위주의 1인분 간편 요리',
      ingredients: [
        { name: '두부', quantity: 100, unit: 'g' },
        { name: '계란', quantity: 2, unit: '개' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '간장', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '양파를 채 썬다.',
        '팬에 기름을 두르고 양파를 볶는다.',
        '두부를 깍둑썰어 함께 볶는다.',
        '계란을 풀어 넣고 부드럽게 익힌다.',
      ],
      est_cooking_min: 12,
      difficulty: 'easy',
    },
  ],
};

export class MockLlmAdapter implements LlmAdapter {
  readonly provider = 'mock';

  async complete(messages: LlmMessage[], opts: LlmCompleteOptions = {}): Promise<LlmResult> {
    const start = Date.now();
    const seed = createHash('sha256').update(messages.map((m) => m.content).join('\n')).digest('hex');

    if (opts.healthCheck) {
      return { text: 'ok', model: 'mock-1', latencyMs: Date.now() - start };
    }

    // 시뮬레이션 지연 50~150ms — seed 1바이트 기반
    const delay = 50 + (parseInt(seed.slice(0, 2), 16) % 100);
    await new Promise((r) => setTimeout(r, delay));

    return {
      text: JSON.stringify(SAMPLE_RECIPE),
      model: 'mock-1',
      latencyMs: Date.now() - start,
    };
  }
}
