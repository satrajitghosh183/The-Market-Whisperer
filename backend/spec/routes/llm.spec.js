import request from 'supertest';
import express from 'express';
import llmRoutes from '../../src/routes/llm.js';
import { LLMService } from '../../src/services/llmService.js';

const app = express();
app.use(express.json());
app.use('/api/llm', llmRoutes);

describe('LLM Routes', () => {
  beforeEach(() => {
    spyOn(LLMService, 'generateExplanation').and.returnValue(
      Promise.resolve('Test explanation for AAPL stock analysis')
    );

    spyOn(LLMService, 'generateTradingStrategy').and.returnValue(
      Promise.resolve('Test trading strategy')
    );
  });

  describe('POST /api/llm/explain', () => {
    it('should generate explanation for ticker analysis', async () => {
      const response = await request(app)
        .post('/api/llm/explain')
        .send({
          ticker: 'AAPL',
          analysis: {
            score: 75,
            recommendation: 'long'
          },
          indicators: {
            rsi: 60,
            momentum60: 0.05
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.explanation).toBeDefined();
      expect(response.body.explanation).toBe('Test explanation for AAPL stock analysis');
    });

    it('should return 400 if ticker is missing', async () => {
      const response = await request(app)
        .post('/api/llm/explain')
        .send({
          analysis: {
            score: 75,
            recommendation: 'long'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Ticker and analysis are required');
    });

    it('should return 400 if analysis is missing', async () => {
      const response = await request(app)
        .post('/api/llm/explain')
        .send({
          ticker: 'AAPL'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Ticker and analysis are required');
    });

    it('should handle optional indicators', async () => {
      const response = await request(app)
        .post('/api/llm/explain')
        .send({
          ticker: 'AAPL',
          analysis: {
            score: 75,
            recommendation: 'long'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.explanation).toBeDefined();
    });

    it('should return 500 on service error', async () => {
      LLMService.generateExplanation.and.returnValue(
        Promise.reject(new Error('LLM service error'))
      );

      const response = await request(app)
        .post('/api/llm/explain')
        .send({
          ticker: 'AAPL',
          analysis: {
            score: 75,
            recommendation: 'long'
          }
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to generate explanation');
    });
  });

  describe('POST /api/llm/strategy', () => {
    it('should generate trading strategy', async () => {
      const response = await request(app)
        .post('/api/llm/strategy')
        .send({
          prompt: 'Generate a strategy for a bullish market'
        });

      expect(response.status).toBe(200);
      expect(response.body.strategy).toBeDefined();
      expect(response.body.strategy).toBe('Test trading strategy');
    });

    it('should return 400 if prompt is missing', async () => {
      const response = await request(app)
        .post('/api/llm/strategy')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Prompt is required');
    });

    it('should return 500 on service error', async () => {
      LLMService.generateTradingStrategy.and.returnValue(
        Promise.reject(new Error('Strategy generation error'))
      );

      const response = await request(app)
        .post('/api/llm/strategy')
        .send({
          prompt: 'Test prompt'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to generate strategy');
    });
  });
});

