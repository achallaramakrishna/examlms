import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  databaseUrl: required('DATABASE_URL'),
  dbPoolMax: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
  dbPoolIdleTimeoutMs: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? '30000', 10),

  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),

  /** text-embedding-3-small's output dimension — must match the pgvector column width. */
  embeddingDimensions: 1536,

  openaiApiKey: process.env.OPENAI_API_KEY ?? '',

  /** Base URL the browser can reach this server at, for linking uploaded question/option images. */
  publicAssetBaseUrl: process.env.PUBLIC_ASSET_BASE_URL ?? 'http://localhost:4000',

  jwt: {
    secret: required('JWT_SECRET', 'dev-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  googleOAuth: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/api/auth/google/callback',
  },
};
