import express from 'express';
import { LLMService } from '../services/llmService.js';
import { validateRequired } from '../middleware/validator.js';

const router = express.Router();

// Generate explanation for a ticker
router.post('/explain', validateRequired(['ticker', 'analysis']), async (req, res) => {
  try {
    const { ticker, analysis, indicators } = req.body;

    const explanation = await LLMService.generateExplanation(
      ticker,
      analysis,
      indicators || {}
    );

    res.json({ explanation });
  } catch (error) {
    console.error('LLM explanation error:', error);
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

// Generate trading strategy
router.post('/strategy', validateRequired(['prompt']), async (req, res) => {
  try {
    const { prompt } = req.body;

    const strategy = await LLMService.generateTradingStrategy(prompt);

    res.json({ strategy });
  } catch (error) {
    console.error('LLM strategy error:', error);
    res.status(500).json({ error: 'Failed to generate strategy' });
  }
});

export default router;

