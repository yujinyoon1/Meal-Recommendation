import { z } from 'zod';

const ConsentInput = z.object({
  type: z.enum(['terms', 'privacy', 'sensitive_health', 'marketing', 'third_party_share']),
  granted: z.boolean(),
});

export const RegisterRequest = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72), // bcrypt 입력 한도
  displayName: z.string().max(100).optional(),
  consents: z.array(ConsentInput).default([]),
});

export const LoginRequest = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(72),
  rememberMe: z.boolean().optional().default(true),
});

export const ConsentSet = z.array(ConsentInput);

export type RegisterInput = z.infer<typeof RegisterRequest>;
export type LoginInput = z.infer<typeof LoginRequest>;
