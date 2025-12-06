import request from 'supertest';
import express from 'express';
import quantRoutes from '../../src/routes/quant.js';
import { QuantService } from '../../src/services/quantService.js';
import { getAvailableTickers, loadStockData } from '../../src/data/dataLayer.js';

const app = express();
app.use(express.json());
app.use('/api/quant', quantRoutes);

describe('Quant Routes', () => {
  beforeEach(() => {
    spyOn(QuantService, 'analyzeTicker').and.returnValue(
      Promise.resolve({
        ticker: 'AAPL',
        score: 75,
        recommendation: 'long',
        indicators: { rsi: 60, momentum60: 0.05 },
        explanation: 'Test explanation',
        timestamp: new Date().toISOString()
      })
    );

    spyOn(getAvailableTickers, 'default').and.returnValue(
      Promise.resolve(['AAPL', 'GOOGL', 'MSFT'])
    );

    spyOn(loadStockData, 'default').and.returnValue(
      Promise.resolve([
        { ticker: 'AAPL', date: '2024-01-01', close: 150.00, open: 149.00, high: 151.00, low: 148.00, volume: 1000000 }
      ])
    );
  });

  describe('GET /api/quant/analysis/:ticker', () => {
    it('should get quant analysis for a ticker', async () => {
      const response = await request(app)
        .get('/api/quant/analysis/AAPL');

      expect(response.status).toBe(200);
      expect(response.body.ticker).toBe('AAPL');
      expect(response.body.score).toBe(75);
      expect(response.body.recommendation).toBe('long');
      expect(response.body.indicators).toBeDefined();
      expect(response.body.explanation).toBeDefined();
    });

    it('should return 404 when no data available', async () => {
      QuantService.analyzeTicker.and.returnValue(
        Promise.resolve({
          indicators: {},
          error: 'No data'
        })
      );

      const response = await request(app)
        .get('/api/quant/analysis/INVALID');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('No data available');
      expect(response.body.error).toContain('Available tickers');
    });

    it('should return 500 on analysis error', async () => {
      QuantService.analyzeTicker.and.returnValue(
        Promise.reject(new Error('Analysis error'))
      );

      const response = await request(app)
        .get('/api/quant/analysis/AAPL');

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to analyze');
    });
  });

  describe('GET /api/quant/tickers', () => {
    it('should get available tickers', async () => {
      const response = await request(app)
        .get('/api/quant/tickers');

      expect(response.status).toBe(200);
      expect(response.body.tickers).toBeDefined();
      expect(Array.isArray(response.body.tickers)).toBe(true);
      expect(response.body.tickers.length).toBe(3);
    });

    it('should return 500 on error', async () => {
      getAvailableTickers.and.returnValue(
        Promise.reject(new Error('Error fetching tickers'))
      );

      const response = await request(app)
        .get('/api/quant/tickers');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch tickers');
    });
  });

  describe('GET /api/quant/data/:ticker', () => {
    it('should get stock data for a ticker', async () => {
      const response = await request(app)
        .get('/api/quant/data/AAPL');

      expect(response.status).toBe(200);
      expect(response.body.ticker).toBe('AAPL');
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeDefined();
      expect(response.body.total).toBeDefined();
    });

    it('should limit data with query parameter', async () => {
      loadStockData.and.returnValue(
        Promise.resolve([
          { ticker: 'AAPL', date: '2024-01-01', close: 150.00, open: 149.00, high: 151.00, low: 148.00, volume: 1000000 },
          { ticker: 'AAPL', date: '2024-01-02', close: 151.00, open: 150.00, high: 152.00, low: 149.00, volume: 1100000 },
          { ticker: 'AAPL', date: '2024-01-03', close: 152.00, open: 151.00, high: 153.00, low: 150.00, volume: 1200000 }
        ])
      );

      const response = await request(app)
        .get('/api/quant/data/AAPL?limit=2');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.total).toBe(3);
    });

    it('should return 404 when no data found', async () => {
      loadStockData.and.returnValue(Promise.resolve([]));

      const response = await request(app)
        .get('/api/quant/data/INVALID');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('No historical data found');
      expect(response.body.ticker).toBe('INVALID');
      expect(response.body.data).toEqual([]);
    });

    it('should return 500 on error', async () => {
      loadStockData.and.returnValue(
        Promise.reject(new Error('Data fetch error'))
      );

      const response = await request(app)
        .get('/api/quant/data/AAPL');

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to fetch data');
    });
  });
});

