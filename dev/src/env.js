import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    BASE_URL: z.string(),
    DATABASE_URL: z.string(),
    PAYLOAD_SECRET: z.string(),
  },
  client: {},
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BASE_URL: (() => {
      const isVercel = process.env.VERCEL === '1';
      if (isVercel) {
        const vercelEnv = process.env.VERCEL_ENV;
        const vercelPreviewUrl = process.env.VERCEL_BRANCH_URL;
        const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

        if (vercelEnv === 'preview') return `https://${vercelPreviewUrl}`;
        if (vercelEnv === 'production') return `https://${vercelProductionUrl}`;
      }

      return process.env.__NEXT_PRIVATE_ORIGIN ?? 'http://localhost:3000';
    })(),
    DATABASE_URL: process.env.DATABASE_URL,
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
