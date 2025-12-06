import { LLMService } from '../../src/services/llmService.js';
import axios from 'axios';

describe('LLMService', () => {
  describe('generateExplanation', () => {
    it('should generate explanation using fallback when no API key', async () => {
      const originalKey = process.env.HUGGINGFACE_API_KEY;
      delete process.env.HUGGINGFACE_API_KEY;

      const analysis = {
        score: 75,
        recommendation: 'long'
      };

      const indicators = {
        momentum60: 0.05,
        rsi: 60,
        current_price: 150.00
      };

      const explanation = await LLMService.generateExplanation('AAPL', analysis, indicators);

      expect(explanation).toBeDefined();
      expect(typeof explanation).toBe('string');
      expect(explanation).toContain('AAPL');
      expect(explanation).toContain('75');
      expect(explanation).toContain('LONG');

      if (originalKey) {
        process.env.HUGGINGFACE_API_KEY = originalKey;
      }
    });

    it('should use fallback explanation with all indicators', async () => {
      const analysis = {
        score: -50,
        recommendation: 'short'
      };

      const indicators = {
        momentum60: -0.1,
        rsi: 75,
        current_price: 100.00,
        deviation100: -0.05
      };

      const explanation = await LLMService.fallbackExplanation('GOOGL', analysis, indicators);

      expect(explanation).toBeDefined();
      expect(explanation).toContain('GOOGL');
      expect(explanation).toContain('SHORT');
      expect(explanation).toContain('RSI');
      expect(explanation).toContain('Momentum');
    });

    it('should handle missing indicators gracefully', async () => {
      const analysis = {
        score: 0,
        recommendation: 'neutral'
      };

      const indicators = {};

      const explanation = await LLMService.fallbackExplanation('MSFT', analysis, indicators);

      expect(explanation).toBeDefined();
      expect(explanation).toContain('MSFT');
      expect(explanation).toContain('NEUTRAL');
    });

    it('should build prompt correctly', () => {
      const analysis = {
        score: 75,
        recommendation: 'long'
      };

      const indicators = {
        momentum60: 0.05,
        rsi: 60,
        current_price: 150.00
      };

      const prompt = LLMService.buildPrompt('AAPL', analysis, indicators);

      expect(prompt).toBeDefined();
      expect(prompt).toContain('AAPL');
      expect(prompt).toContain('75');
      expect(prompt).toContain('long');
      expect(prompt).toContain('Positive');
      expect(prompt).toContain('60');
      expect(prompt).toContain('150');
    });
  });

  describe('generateTradingStrategy', () => {
    it('should return message when no API key', async () => {
      const originalKey = process.env.HUGGINGFACE_API_KEY;
      delete process.env.HUGGINGFACE_API_KEY;

      const strategy = await LLMService.generateTradingStrategy('Test prompt');

      expect(strategy).toBeDefined();
      expect(typeof strategy).toBe('string');
      expect(strategy).toContain('API key');

      if (originalKey) {
        process.env.HUGGINGFACE_API_KEY = originalKey;
      }
    });

    it('should handle API errors gracefully', async () => {
      spyOn(axios, 'post').and.returnValue(Promise.reject(new Error('API Error')));

      const strategy = await LLMService.generateTradingStrategy('Test prompt');

      expect(strategy).toBeDefined();
      expect(typeof strategy).toBe('string');
    });
  });

  describe('explainPortfolioDecision', () => {
    it('should explain portfolio decision', async () => {
      const portfolio = {
        portfolioId: 'portfolio_1',
        userId: 'user_1'
      };

      const recommendation = [
        { ticker: 'AAPL', weight: 0.5 },
        { ticker: 'GOOGL', weight: 0.5 }
      ];

      spyOn(LLMService, 'generateTradingStrategy').and.returnValue(Promise.resolve('Test explanation'));

      const explanation = await LLMService.explainPortfolioDecision(portfolio, recommendation);

      expect(explanation).toBeDefined();
      expect(explanation).toBe('Test explanation');
    });

    it('should use fallback when strategy generation fails', async () => {
      const portfolio = {
        portfolioId: 'portfolio_1',
        userId: 'user_1'
      };

      const recommendation = [
        { ticker: 'AAPL', weight: 0.5 }
      ];

      spyOn(LLMService, 'generateTradingStrategy').and.returnValue(Promise.reject(new Error('Error')));

      const explanation = await LLMService.explainPortfolioDecision(portfolio, recommendation);

      expect(explanation).toBeDefined();
      expect(explanation).toContain('diversification');
    });
  });

  describe('fallbackPortfolioExplanation', () => {
    it('should generate fallback portfolio explanation', () => {
      const portfolio = {
        portfolioId: 'portfolio_1'
      };

      const recommendation = [
        { ticker: 'AAPL', weight: 0.5 },
        { ticker: 'GOOGL', weight: 0.5 }
      ];

      const explanation = LLMService.fallbackPortfolioExplanation(portfolio, recommendation);

      expect(explanation).toBeDefined();
      expect(explanation).toContain('diversification');
      expect(explanation).toContain('2');
    });
  });
});

