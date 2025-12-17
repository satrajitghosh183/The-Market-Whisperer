import { vi } from 'vitest';

// Mock Supabase client for testing
vi.mock('../db/client', () => {
  const mockData: Record<string, any[]> = {
    users: [],
    wallets: [],
    ledger_transactions: [],
    ledger_entries: [],
    portfolios: [],
    positions: [],
    orders: [],
    reports: [],
    market_prices_cache: [],
    indicator_features: [],
    news_articles: [],
    news_daily_aggregates: [],
    hedged_trades: [],
  };

  let idCounter = 1;

  const createMockQueryBuilder = (tableName: string) => {
    let filters: Record<string, any> = {};
    let selectColumns = '*';
    let insertData: any = null;
    let updateData: any = null;
    let limitCount: number | null = null;
    let orderConfig: { column: string; ascending: boolean } | null = null;

    const builder = {
      select: (columns = '*') => {
        selectColumns = columns;
        return builder;
      },
      insert: (data: any) => {
        insertData = data;
        return builder;
      },
      update: (data: any) => {
        updateData = data;
        return builder;
      },
      upsert: (data: any, options?: any) => {
        insertData = data;
        return builder;
      },
      delete: () => {
        return builder;
      },
      eq: (column: string, value: any) => {
        filters[column] = value;
        return builder;
      },
      gte: (column: string, value: any) => {
        filters[`${column}_gte`] = value;
        return builder;
      },
      lte: (column: string, value: any) => {
        filters[`${column}_lte`] = value;
        return builder;
      },
      order: (column: string, options: { ascending: boolean }) => {
        orderConfig = { column, ascending: options.ascending };
        return builder;
      },
      limit: (count: number) => {
        limitCount = count;
        return builder;
      },
      single: async () => {
        if (insertData) {
          const newItem = {
            id: `mock-${idCounter++}`,
            ...insertData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          mockData[tableName].push(newItem);
          return { data: newItem, error: null };
        }
        
        if (updateData) {
          const index = mockData[tableName].findIndex((item) =>
            Object.entries(filters).every(([key, value]) => item[key] === value)
          );
          if (index >= 0) {
            mockData[tableName][index] = { ...mockData[tableName][index], ...updateData };
            return { data: mockData[tableName][index], error: null };
          }
          return { data: null, error: { message: 'Not found' } };
        }
        
        const item = mockData[tableName].find((item) =>
          Object.entries(filters).every(([key, value]) => {
            if (key.endsWith('_gte')) return item[key.replace('_gte', '')] >= value;
            if (key.endsWith('_lte')) return item[key.replace('_lte', '')] <= value;
            return item[key] === value;
          })
        );
        return { data: item || null, error: null };
      },
      maybeSingle: async () => {
        const item = mockData[tableName].find((item) =>
          Object.entries(filters).every(([key, value]) => {
            if (key.endsWith('_gte')) return item[key.replace('_gte', '')] >= value;
            if (key.endsWith('_lte')) return item[key.replace('_lte', '')] <= value;
            return item[key] === value;
          })
        );
        return { data: item || null, error: null };
      },
      then: async (resolve: any) => {
        let results = mockData[tableName].filter((item) =>
          Object.entries(filters).every(([key, value]) => {
            if (key.endsWith('_gte')) return item[key.replace('_gte', '')] >= value;
            if (key.endsWith('_lte')) return item[key.replace('_lte', '')] <= value;
            return item[key] === value;
          })
        );
        
        if (orderConfig) {
          results.sort((a, b) => {
            const aVal = a[orderConfig!.column];
            const bVal = b[orderConfig!.column];
            return orderConfig!.ascending ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
          });
        }
        
        if (limitCount !== null) {
          results = results.slice(0, limitCount);
        }
        
        resolve({ data: results, error: null });
      },
    };

    return builder;
  };

  const mockSupabase = {
    from: (tableName: string) => createMockQueryBuilder(tableName),
    rpc: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
  };

  return {
    getSupabaseClient: () => mockSupabase,
    resetSupabaseClient: () => {},
    checkDatabaseHealth: async () => ({ status: 'up', latencyMs: 10 }),
    withTransaction: async <T>(callback: (client: any) => Promise<T>) => callback(mockSupabase),
    // Expose mock data for testing
    __mockData: mockData,
    __resetMockData: () => {
      Object.keys(mockData).forEach((key) => {
        mockData[key] = [];
      });
    },
  };
});

// Mock config
vi.mock('../config', () => ({
  config: {
    port: 3001,
    nodeEnv: 'test',
    supabase: {
      url: 'http://localhost:54321',
      anonKey: 'test-key',
      serviceKey: 'test-service-key',
    },
    jwt: {
      secret: 'test-secret-key-for-testing',
      expiresIn: 86400,
    },
    bcrypt: {
      rounds: 4,
    },
    marketData: {
      provider: 'mock',
      apiKey: '',
      cacheTtlSeconds: 300,
    },
    rateLimit: {
      windowMs: 60000,
      maxRequests: 100,
    },
    version: '1.0.0-test',
  },
  validateConfig: () => {},
}));

