import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Wix App Configuration (OAuth)
  WIX_APP_ID: z.string().min(1, 'WIX_APP_ID is required'),
  WIX_APP_SECRET: z.string().min(1, 'WIX_APP_SECRET is required'),
  WIX_WEBHOOK_PUBLIC_KEY: z.string().min(1, 'WIX_WEBHOOK_PUBLIC_KEY is required'),
  BASE_URL: z.string().url('BASE_URL must be a valid URL'),
  
  // Wix API Keys (Optional - for public buyer/LLM endpoints)
  WIX_API_KEY: z.string().optional(),
  WIX_ACCOUNT_ID: z.string().optional(),
  WIX_SITE_ID: z.string().optional(),
  
  // Redis (Optional - falls back to in-memory if not provided)
  REDIS_URL: z.string().url().optional(),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

export const config = validateEnv();
