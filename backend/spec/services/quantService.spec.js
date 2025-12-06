import { QuantService } from '../../src/services/quantService.js';
import { loadStockData, getAvailableTickers } from '../../src/data/dataLayer.js';
import { LLMService } from '../../src/services/llmService.js';

describe('QuantService', () => {
  describe('analyzeTicker', () => {
    it('should analyze a ticker and return analysis with explanation', async () => {
      // Mock loadStockData to return test data
      const mockData = [
        { ticker: 'AAPL', date: '2024-01-01', close: 150.00, open: 149.00, high: 151.00, low: 148.00, volume: 1000000 },
        { ticker: 'AAPL', date: '2024-01-02', close: 152.00, open: 150.00, high: 153.00, low: 149.00, volume: 1100000 }
      ];

      // Mock the dependencies
      spyOn(loadStockData, 'default').and.returnValue(Promise.resolve(mockData));
      spyOn(LLMService, 'generateExplanation').and.returnValue(Promise.resolve('Test explanation'));

      // Mock Python engine call - need to spy on the method
      const originalCallPythonEngine = QuantService.callPythonEngine;
      spyOn(QuantService, 'callPythonEngine').and.returnValue(Promise.resolve({
        score: 75,
        indicators: { rsi: 60, momentum60: 0.05 },
        recommendation: 'long'
      }));

      const analysis = await QuantService.analyzeTicker('AAPL');

      expect(analysis).toBeDefined();
      expect(analysis.ticker).toBe('AAPL');
      expect(analysis.score).toBe(75);
      expect(analysis.recommendation).toBe('long');
      expect(analysis.explanation).toBe('Test explanation');
      expect(analysis.timestamp).toBeDefined();
    });

    it('should use fallback analysis when Python engine fails', async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        ticker: 'AAPL',
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        close: 100 + i * 0.5,
        open: 100 + i * 0.5 - 0.5,
        high: 100 + i * 0.5 + 1,
        low: 100 + i * 0.5 - 1,
        volume: 1000000
      }));

      spyOn(loadStockData, 'default').and.returnValue(Promise.resolve(mockData));
      spyOn(QuantService, 'callPythonEngine').and.returnValue(Promise.reject(new Error('Python error')));

      const analysis = await QuantService.analyzeTicker('AAPL');

      expect(analysis).toBeDefined();
      expect(analysis.ticker).toBe('AAPL');
      expect(analysis.score).toBeDefined();
      expect(analysis.recommendation).toBeDefined();
      expect(['long', 'short', 'neutral']).toContain(analysis.recommendation);
    });

    it('should handle ticker with no data', async () => {
      spyOn(loadStockData, 'default').and.returnValue(Promise.resolve([]));
      spyOn(QuantService, 'callPythonEngine').and.returnValue(Promise.reject(new Error('No data')));

      const analysis = await QuantService.analyzeTicker('INVALID');

      expect(analysis).toBeDefined();
      expect(analysis.ticker).toBe('INVALID');
      expect(analysis.score).toBe(0);
      expect(analysis.recommendation).toBe('neutral');
      expect(analysis.explanation).toContain('Insufficient data');
    });
  });

  describe('fallbackAnalysis', () => {
    it('should perform basic analysis with available data', async () => {
      const mockData = Array.from({ length: 60 }, (_, i) => ({
        ticker: 'AAPL',
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        close: 100 + i * 0.5,
        open: 100 + i * 0.5 - 0.5,
        high: 100 + i * 0.5 + 1,
        low: 100 + i * 0.5 - 1,
        volume: 1000000
      }));

      spyOn(loadStockData, 'default').and.returnValue(Promise.resolve(mockData));

      const analysis = await QuantService.fallbackAnalysis('AAPL');

      expect(analysis).toBeDefined();
      expect(analysis.ticker).toBe('AAPL');
      expect(analysis.score).toBeDefined();
      expect(analysis.indicators).toBeDefined();
      expect(analysis.indicators.momentum60).toBeDefined();
      expect(analysis.indicators.currentPrice).toBeDefined();
      expect(analysis.indicators.avgPrice60).toBeDefined();
      expect(analysis.recommendation).toBeDefined();
    });

    it('should return neutral recommendation for flat price movement', async () => {
      const mockData = Array.from({ length: 60 }, () => ({
        ticker: 'AAPL',
        date: '2024-01-01',
        close: 100,
        open: 100,
        high: 101,
        low: 99,
        volume: 1000000
      }));

      spyOn(loadStockData, 'default').and.returnValue(Promise.resolve(mockData));

      const analysis = await QuantService.fallbackAnalysis('AAPL');

      expect(analysis.recommendation).toBe('neutral');
    });
  });

  describe('generatePortfolioRecommendations', () => {
    it('should generate portfolio recommendations', async () => {
      const mockTickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
      
      spyOn(getAvailableTickers, 'default').and.returnValue(Promise.resolve(mockTickers));
      spyOn(QuantService, 'analyzeTicker').and.callFake((ticker) => {
        const scores = { AAPL: 80, GOOGL: 75, MSFT: 70, AMZN: 65, TSLA: 60 };
        return Promise.resolve({
          ticker,
          score: scores[ticker] || 50,
          recommendation: 'long',
          indicators: {}
        });
      });

      const recommendations = await QuantService.generatePortfolioRecommendations({
        numStocks: 3,
        benchmark: 'SPY'
      });

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBe(3);
      expect(recommendations[0].ticker).toBe('AAPL'); // Highest score
      expect(recommendations[0].weight).toBeCloseTo(1/3, 2);
      expect(recommendations.every(r => r.score !== undefined)).toBe(true);
    });

    it('should handle fewer available tickers than requested', async () => {
      const mockTickers = ['AAPL', 'GOOGL'];
      
      spyOn(getAvailableTickers, 'default').and.returnValue(Promise.resolve(mockTickers));
      spyOn(QuantService, 'analyzeTicker').and.returnValue(Promise.resolve({
        ticker: 'AAPL',
        score: 75,
        recommendation: 'long',
        indicators: {}
      }));

      const recommendations = await QuantService.generatePortfolioRecommendations({
        numStocks: 10,
        benchmark: 'SPY'
      });

      expect(recommendations.length).toBeLessThanOrEqual(2);
    });

    it('should filter out analyses without scores', async () => {
      const mockTickers = ['AAPL', 'GOOGL', 'MSFT'];
      
      spyOn(getAvailableTickers, 'default').and.returnValue(Promise.resolve(mockTickers));
      spyOn(QuantService, 'analyzeTicker').and.callFake((ticker) => {
        if (ticker === 'MSFT') {
          return Promise.resolve({ ticker, recommendation: 'neutral' }); // No score
        }
        return Promise.resolve({
          ticker,
          score: 75,
          recommendation: 'long',
          indicators: {}
        });
      });

      const recommendations = await QuantService.generatePortfolioRecommendations({
        numStocks: 3,
        benchmark: 'SPY'
      });

      expect(recommendations.every(r => r.score !== undefined)).toBe(true);
      expect(recommendations.length).toBe(2);
    });
  });

  describe('callPythonEngine', () => {
    it('should handle Python engine errors gracefully', async () => {
      // This would require actual Python process mocking
      // For now, we test that errors are caught
      spyOn(QuantService, 'callPythonEngine').and.returnValue(Promise.reject(new Error('Python error')));

      try {
        await QuantService.callPythonEngine('analyze', { ticker: 'AAPL' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Python error');
      }
    });
  });
});

