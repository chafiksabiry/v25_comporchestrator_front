import { z } from 'zod';

const envSchema = z.object({
  API_URL: z.string().optional().default(''),
  API_URL_CALL: z.string().optional().default(''),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

const callsApiOrigin =
  import.meta.env.VITE_API_URL_CALL ||
  (typeof window !== 'undefined'
    ? (window as unknown as { __HARX_ENV__?: { VITE_API_URL_CALL?: string } })
        .__HARX_ENV__?.VITE_API_URL_CALL
    : undefined) ||
  'https://v25dashcallsbackend-production.up.railway.app/api';

export const env = envSchema.parse({
  API_URL: import.meta.env.VITE_COMPANY_API_URL,
  // axios paths are `/api/calls/...` — origin must not include trailing `/api`
  API_URL_CALL: callsApiOrigin.replace(/\/api\/?$/, ''),
  NODE_ENV: import.meta.env.MODE,
});
