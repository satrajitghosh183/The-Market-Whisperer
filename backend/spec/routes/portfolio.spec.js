import request from 'supertest';
import express from 'express';
import portfolioRoutes from '../../src/routes/portfolio.js';
import { dataLayer, initializeDataLayer } from '../../src/data/dataLayer.js';
import { QuantService } from '../../src/services/quantService.js';

const app = express();
app.use(express.json());
app.use('/api/portfolio', portfolioRoutes);

describe('Portfolio Routes', () => {
  let testUser;
  let testPortfolio;

  beforeEach(async () => {
    await initializeDataLayer();
    
    testUser = await dataLayer.createUser({
      email: 'portfolio@test.com',
      passwordHash: 'hash',
      role: 'investor'
    });

    testPortfolio = await dataLayer.createPortfolio({
      userId: testUser.userId,
      benchmark: 'SPY',
      strategyId: 'default',
      holdings: ['AAPL', 'GOOGL'],
      targetWeights: { AAPL: 0.5, GOOGL: 0.5 }
    });
  });

  describe('GET /api/portfolio/user/:userId', () => {
    it('should get all portfolios for a user', async () => {
      const response = await request(app)
        .get(`/api/portfolio/user/${testUser.userId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].userId).toBe(testUser.userId);
      expect(response.body[0].positions).toBeDefined();
    });

    it('should return empty array for user with no portfolios', async () => {
      const newUser = await dataLayer.createUser({
        email: 'noportfolio@test.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const response = await request(app)
        .get(`/api/portfolio/user/${newUser.userId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/portfolio/:portfolioId', () => {
    it('should get portfolio details with positions', async () => {
      // Create some positions
      await dataLayer.createPosition({
        portfolioId: testPortfolio.portfolioId,
        ticker: 'AAPL',
        shares: 10,
        avgCost: 150.00,
        currentPrice: 155.00
      });

      const response = await request(app)
        .get(`/api/portfolio/${testPortfolio.portfolioId}`);

      expect(response.status).toBe(200);
      expect(response.body.portfolioId).toBe(testPortfolio.portfolioId);
      expect(response.body.positions).toBeDefined();
      expect(Array.isArray(response.body.positions)).toBe(true);
      expect(response.body.totalValue).toBeDefined();
      expect(response.body.unrealizedPnL).toBeDefined();
    });

    it('should return 404 for non-existent portfolio', async () => {
      const response = await request(app)
        .get('/api/portfolio/non_existent_portfolio');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Portfolio not found');
    });
  });

  describe('POST /api/portfolio/generate', () => {
    beforeEach(() => {
      spyOn(QuantService, 'generatePortfolioRecommendations').and.returnValue(
        Promise.resolve([
          { ticker: 'AAPL', score: 80, recommendation: 'long', weight: 0.5, indicators: {} },
          { ticker: 'GOOGL', score: 75, recommendation: 'long', weight: 0.5, indicators: {} }
        ])
      );
    });

    it('should generate portfolio with recommendations', async () => {
      const response = await request(app)
        .post('/api/portfolio/generate')
        .send({
          userId: testUser.userId,
          numStocks: 2,
          benchmark: 'SPY'
        });

      expect(response.status).toBe(200);
      expect(response.body.portfolio).toBeDefined();
      expect(response.body.recommendations).toBeDefined();
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      expect(response.body.recommendations.length).toBe(2);
    });

    it('should create new portfolio if user has none', async () => {
      const newUser = await dataLayer.createUser({
        email: 'newportfolio@test.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const response = await request(app)
        .post('/api/portfolio/generate')
        .send({
          userId: newUser.userId,
          numStocks: 2,
          benchmark: 'SPY'
        });

      expect(response.status).toBe(200);
      expect(response.body.portfolio).toBeDefined();
      expect(response.body.portfolio.userId).toBe(newUser.userId);
    });

    it('should update existing portfolio', async () => {
      const response = await request(app)
        .post('/api/portfolio/generate')
        .send({
          userId: testUser.userId,
          numStocks: 2,
          benchmark: 'SPY'
        });

      expect(response.status).toBe(200);
      expect(response.body.portfolio.portfolioId).toBe(testPortfolio.portfolioId);
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .post('/api/portfolio/generate')
        .send({
          numStocks: 2,
          benchmark: 'SPY'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User ID is required');
    });

    it('should return 500 when quant service fails', async () => {
      QuantService.generatePortfolioRecommendations.and.returnValue(
        Promise.reject(new Error('Quant service error'))
      );

      const response = await request(app)
        .post('/api/portfolio/generate')
        .send({
          userId: testUser.userId,
          numStocks: 2,
          benchmark: 'SPY'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to generate portfolio');
    });

    it('should return 404 when no recommendations available', async () => {
      QuantService.generatePortfolioRecommendations.and.returnValue(
        Promise.resolve([])
      );

      const response = await request(app)
        .post('/api/portfolio/generate')
        .send({
          userId: testUser.userId,
          numStocks: 2,
          benchmark: 'SPY'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('No recommendations available');
    });
  });

  describe('POST /api/portfolio/:portfolioId/rebalance', () => {
    beforeEach(async () => {
      await dataLayer.createPosition({
        portfolioId: testPortfolio.portfolioId,
        ticker: 'AAPL',
        shares: 10,
        avgCost: 150.00,
        currentPrice: 150.00
      });

      await dataLayer.createPosition({
        portfolioId: testPortfolio.portfolioId,
        ticker: 'GOOGL',
        shares: 5,
        avgCost: 2000.00,
        currentPrice: 2000.00
      });
    });

    it('should generate rebalance instructions', async () => {
      const response = await request(app)
        .post(`/api/portfolio/${testPortfolio.portfolioId}/rebalance`);

      expect(response.status).toBe(200);
      expect(response.body.instructions).toBeDefined();
      expect(Array.isArray(response.body.instructions)).toBe(true);
      expect(response.body.message).toBe('Rebalancing instructions generated');
    });

    it('should return 404 for non-existent portfolio', async () => {
      const response = await request(app)
        .post('/api/portfolio/non_existent_portfolio/rebalance');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Portfolio not found');
    });
  });
});

