import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { Express } from 'express';

// Import test setup (mocks)
import './setup';

describe('Market Whisperer API Tests', () => {
  let app: Express;
  let authToken: string;
  let userId: string;
  let portfolioId: string;
  let orderId: string;

  beforeAll(() => {
    app = createApp();
  });

  // ============================================
  // Module 18: Health / Diagnostics
  // ============================================
  describe('Module 18: Health / Diagnostics', () => {
    it('GET /health returns health status with version', async () => {
      const res = await request(app).get('/health');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('version');
      expect(res.body.data).toHaveProperty('timestamp');
      expect(res.body.data).toHaveProperty('checks');
      expect(res.body.data.checks).toHaveProperty('database');
    });

    it('GET /health/live returns liveness check', async () => {
      const res = await request(app).get('/health/live');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.live).toBe(true);
    });
  });

  // ============================================
  // Module 1: User Registration
  // ============================================
  describe('Module 1: User Registration', () => {
    it('should register a new user with secure password hashing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'securePassword123',
          display_name: 'Test User',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user).toHaveProperty('email', 'test@example.com');
      expect(res.body.data.user).not.toHaveProperty('password_hash');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      
      authToken = res.body.data.tokens.accessToken;
      userId = res.body.data.user.id;
    });

    it('should reject duplicate emails with 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'anotherPassword123',
        });
      
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('should validate request body', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // too short
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ============================================
  // Module 2: User Login Validation
  // ============================================
  describe('Module 2: User Login Validation', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'securePassword123',
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).not.toHaveProperty('password_hash');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongPassword',
        });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // ============================================
  // Module 3: Auth Guard / Protected Routes
  // ============================================
  describe('Module 3: Auth Guard / Protected Routes', () => {
    it('should reject requests without auth token', async () => {
      const res = await request(app).get('/api/auth/me');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject invalid tokens', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should allow access with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email');
    });
  });

  // ============================================
  // Module 4 & 5: Wallet Provisioning & Funding
  // ============================================
  describe('Module 4 & 5: Wallet Provisioning & Funding', () => {
    it('should get user wallet (auto-provisioned)', async () => {
      const res = await request(app)
        .get('/api/wallet')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('cash_balance');
    });

    it('should deposit funds with idempotency', async () => {
      const idempotencyKey = 'deposit-test-1';
      
      const res = await request(app)
        .post('/api/wallet/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 10000,
          idempotency_key: idempotencyKey,
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(parseFloat(res.body.data.cash_balance)).toBeGreaterThan(0);
    });

    it('should reject negative amounts', async () => {
      const res = await request(app)
        .post('/api/wallet/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -100,
          idempotency_key: 'test-negative',
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================================
  // Module 6: Double-Entry Ledger
  // ============================================
  describe('Module 6: Double-Entry Ledger', () => {
    it('should get wallet transactions', async () => {
      const res = await request(app)
        .get('/api/wallet/transactions')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ============================================
  // Module 10: Portfolio Creation / Retrieval
  // ============================================
  describe('Module 10: Portfolio Creation / Retrieval', () => {
    it('should create a portfolio', async () => {
      const res = await request(app)
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Portfolio',
          description: 'A test portfolio',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('Test Portfolio');
      
      portfolioId = res.body.data.id;
    });

    it('should get all portfolios', async () => {
      const res = await request(app)
        .get('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get portfolio by ID', async () => {
      const res = await request(app)
        .get(`/api/portfolios/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(portfolioId);
    });
  });

  // ============================================
  // Module 7: Order Placement
  // ============================================
  describe('Module 7: Order Placement', () => {
    it('should create a buy order', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolio_id: portfolioId,
          ticker: 'AAPL',
          side: 'BUY',
          quantity: 10,
          price: 150,
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.status).toBe('PENDING');
      
      orderId = res.body.data.id;
    });

    it('should validate order input', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolio_id: portfolioId,
          ticker: 'AAPL',
          side: 'INVALID',
          quantity: -10,
          price: 0,
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================================
  // Module 8: Order Settlement
  // ============================================
  describe('Module 8: Order Settlement', () => {
    it('should settle an order', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/settle`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('FILLED');
    });

    it('should reject settling already filled order', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/settle`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================================
  // Module 9 & 11: Positions & Portfolio Valuation
  // ============================================
  describe('Module 9 & 11: Positions & Portfolio Valuation', () => {
    it('should get portfolio positions', async () => {
      const res = await request(app)
        .get(`/api/portfolios/${portfolioId}/positions`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get portfolio valuation with P&L', async () => {
      const res = await request(app)
        .get(`/api/portfolios/${portfolioId}/valuation`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('portfolio');
      expect(res.body.data).toHaveProperty('positions');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data.summary).toHaveProperty('totalMarketValue');
      expect(res.body.data.summary).toHaveProperty('totalUnrealizedPnl');
    });
  });

  // ============================================
  // Module 12: Reports Generation
  // ============================================
  describe('Module 12: Reports Generation', () => {
    it('should generate a portfolio report', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          report_type: 'PORTFOLIO_SUMMARY',
          start_date: today,
          end_date: today,
          portfolio_id: portfolioId,
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('input_params');
      expect(res.body.data).toHaveProperty('output_data');
    });

    it('should get all reports', async () => {
      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ============================================
  // Module 13: Market Data Integration
  // ============================================
  describe('Module 13: Market Data Integration', () => {
    it('should get a quote for a ticker', async () => {
      const res = await request(app).get('/api/market/quote/AAPL');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('ticker', 'AAPL');
      expect(res.body.data).toHaveProperty('price');
      expect(res.body.data).toHaveProperty('change');
    });

    it('should get historical prices', async () => {
      const res = await request(app).get('/api/market/history/AAPL?limit=10');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ============================================
  // Module 14: Quant Analytics
  // ============================================
  describe('Module 14: Quant Analytics', () => {
    it('should compute indicators for a ticker', async () => {
      const res = await request(app)
        .post('/api/market/indicators')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticker: 'AAPL',
          window_size: 20,
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('sma');
      expect(res.body.data).toHaveProperty('ema');
      expect(res.body.data).toHaveProperty('rsi');
      expect(res.body.data).toHaveProperty('composite_score');
    });
  });

  // ============================================
  // Module 15: News + Sentiment Pipeline
  // ============================================
  describe('Module 15: News + Sentiment Pipeline', () => {
    it('should ingest a news article', async () => {
      const res = await request(app)
        .post('/api/market/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticker: 'AAPL',
          source: 'Test News',
          headline: 'Apple stock surges on strong earnings beat',
          summary: 'Apple reported record profits',
          published_at: new Date().toISOString(),
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('sentiment_score');
      expect(res.body.data).toHaveProperty('sentiment_label');
    });

    it('should get news articles for a ticker', async () => {
      const res = await request(app).get('/api/market/news/AAPL');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ============================================
  // Module 16: Explainability
  // ============================================
  describe('Module 16: Explainability', () => {
    it('should get grounded explanation', async () => {
      const res = await request(app)
        .post('/api/market/explain')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticker: 'AAPL',
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('ticker');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('confidence');
    });
  });

  // ============================================
  // Module 17: Coupled Hedged Trades
  // ============================================
  describe('Module 17: Coupled Hedged Trades', () => {
    it('should execute hedged trade with diagnostics', async () => {
      // Deposit more funds first
      await request(app)
        .post('/api/wallet/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50000,
          idempotency_key: 'deposit-hedge-1',
        });

      const res = await request(app)
        .post('/api/hedged-trades')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolio_id: portfolioId,
          primary_ticker: 'AAPL',
          primary_side: 'BUY',
          primary_quantity: 10,
          primary_price: 150,
          hedge_ticker: 'SPY',
          hedge_quantity: 5,
          hedge_price: 450,
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('hedgedTrade');
      expect(res.body.data).toHaveProperty('diagnostics');
      expect(res.body.data.diagnostics).toHaveProperty('beta');
      expect(res.body.data.diagnostics).toHaveProperty('rSquared');
    });

    it('should get hedged trades', async () => {
      const res = await request(app)
        .get('/api/hedged-trades')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ============================================
  // Error Envelope Consistency
  // ============================================
  describe('Error Envelope Consistency', () => {
    it('should return consistent error envelope on 404', async () => {
      const res = await request(app).get('/api/nonexistent');
      
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
    });

    it('should return consistent error envelope on validation error', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(res.body.error).toHaveProperty('details');
    });
  });
});

