import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

function optionalInt(key: string, fallback: number): number {
  const v = process.env[key];
  return v ? parseInt(v, 10) : fallback;
}

export const config = {
  app: {
    env: optional('NODE_ENV', 'development'),
    port: optionalInt('PORT', 5100),
    logLevel: optional('LOG_LEVEL', 'info'),
    requestTimeoutMs: optionalInt('REQUEST_TIMEOUT_MS', 30000),
    isDev: optional('NODE_ENV', 'development') === 'development',
    publicBaseUrl: optional('PUBLIC_BASE_URL', 'http://localhost:5100'),
  },
  supabase: {
    url: requireEnv('SUPABASE_URL'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },
  redis: {
    host: optional('REDIS_HOST', 'localhost'),
    port: optionalInt('REDIS_PORT', 6380),
    password: optional('REDIS_PASSWORD') || undefined,
    db: optionalInt('REDIS_DB', 0),
  },
  telenow: {
    apiKey: optional('TELENOW_API_KEY'),
    webhookSecret: optional('TELENOW_WEBHOOK_SECRET'),
  },
  whatsapp: {
    verifyToken: optional('WHATSAPP_VERIFY_TOKEN'),
    appSecret: optional('WHATSAPP_APP_SECRET'),
    accessToken: optional('WHATSAPP_ACCESS_TOKEN'),
    phoneNumberId: optional('WHATSAPP_PHONE_NUMBER_ID'),
    apiVersion: optional('WHATSAPP_API_VERSION', 'v18.0'),
    apiBaseUrl: optional('WHATSAPP_API_BASE_URL', 'https://graph.facebook.com'),
    sessionTtlHours: optionalInt('WHATSAPP_SESSION_TTL_HOURS', 24),
  },
  providers: {
    a: {
      apiUrl: optional('PROVIDER_A_API_URL'),
      apiKey: optional('PROVIDER_A_API_KEY'),
    },
    b: {
      apiUrl: optional('PROVIDER_B_API_URL'),
      apiKey: optional('PROVIDER_B_API_KEY'),
    },
  },
  rateLimit: {
    windowMs: optionalInt('RATE_LIMIT_WINDOW_MS', 60_000),
    maxRequests: optionalInt('RATE_LIMIT_MAX_REQUESTS', 100),
  },
  workers: {
    quotationConcurrency: optionalInt('QUOTATION_WORKER_CONCURRENCY', 5),
    whatsappConcurrency: optionalInt('WHATSAPP_WORKER_CONCURRENCY', 10),
    notificationConcurrency: optionalInt('NOTIFICATION_WORKER_CONCURRENCY', 5),
  },
} as const;
