import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '86400', 10), // 24 hours in seconds
  },
  
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  },
  
  marketData: {
    provider: process.env.MARKET_DATA_PROVIDER || 'mock',
    apiKey: process.env.MARKET_DATA_API_KEY || '',
    cacheTtlSeconds: parseInt(process.env.MARKET_DATA_CACHE_TTL || '300', 10), // 5 minutes
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  version: process.env.APP_VERSION || '1.0.0',
};

export function validateConfig(): void {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0 && config.nodeEnv !== 'test') {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
  }
}

