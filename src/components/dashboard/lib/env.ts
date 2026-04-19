import { z } from 'zod';

const envSchema = z.object({
  API_URL: z.string().optional().default(''),
  API_URL_CALL: z.string().optional().default(''),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export const env = envSchema.parse({
  API_URL: import.meta.env.VITE_API_URL,
  API_URL_CALL: import.meta.env.VITE_API_URL_CALL,
  NODE_ENV: import.meta.env.MODE
});
