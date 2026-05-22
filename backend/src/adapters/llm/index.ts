import { env } from '../../config/env.js';
import { OpenAiAdapter } from './openai.js';
import { MockLlmAdapter } from './mock.js';
import { LlmAdapter } from './types.js';

let instance: LlmAdapter | null = null;

export function getLlm(): LlmAdapter {
  if (instance) return instance;
  switch (env.LLM_PROVIDER) {
    case 'openai':
      instance = new OpenAiAdapter();
      break;
    case 'mock':
    default:
      instance = new MockLlmAdapter();
      break;
  }
  return instance;
}

export * from './types.js';
