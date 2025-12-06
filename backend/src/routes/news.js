import express from 'express';
import { NewsService } from '../services/newsService.js';
import { SentimentService } from '../services/sentimentService.js';
import { validateTicker, validateNumericQuery } from '../middleware/validator.js';

const router = express.Router();

/**
 * GET /api/news/ticker/:ticker
 * Fetch news articles for a specific ticker
 */
router.get('/ticker/:ticker', validateTicker, validateNumericQuery(['days']), async (req, res) => {
  try {
    const ticker = req.validatedTicker || req.params.ticker.toUpperCase();
    const days = req.query.days || 7;
    
    const articles = await NewsService.fetchNewsForTicker(ticker, days);
    
    res.json({
      success: true,
      ticker: ticker,
      articles,
      count: articles.length
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/news/business
 * Fetch general business news
 */
router.get('/business', validateNumericQuery(['limit']), async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    
    const articles = await NewsService.fetchBusinessNews(limit);
    
    res.json({
      success: true,
      articles,
      count: articles.length
    });
  } catch (error) {
    console.error('Error fetching business news:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/news/search
 * Search news by query
 */
router.get('/search', validateNumericQuery(['days']), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required and cannot be empty'
      });
    }
    
    const days = req.query.days || 7;
    const articles = await NewsService.searchNews(q, days);
    
    res.json({
      success: true,
      query: q,
      articles,
      count: articles.length
    });
  } catch (error) {
    console.error('Error searching news:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/news/sentiment
 * Analyze sentiment of provided text or articles
 */
router.post('/sentiment', async (req, res) => {
  try {
    const { text, articles } = req.body;
    
    if (text) {
      const sentiment = await SentimentService.analyzeSentiment(text);
      return res.json({
        success: true,
        sentiment
      });
    }
    
    if (articles && Array.isArray(articles)) {
      const sentimentData = await SentimentService.analyzeNewsSentiment(articles);
      return res.json({
        success: true,
        sentiment: sentimentData
      });
    }
    
    res.status(400).json({
      success: false,
      error: 'Either "text" or "articles" must be provided'
    });
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/news/ticker/:ticker/sentiment
 * Get news and sentiment analysis for a ticker
 */
router.get('/ticker/:ticker/sentiment', validateTicker, validateNumericQuery(['days']), async (req, res) => {
  try {
    const ticker = req.validatedTicker || req.params.ticker.toUpperCase();
    const days = req.query.days || 7;
    
    const articles = await NewsService.fetchNewsForTicker(ticker, days);
    const sentimentData = await SentimentService.analyzeNewsSentiment(articles);
    
    res.json({
      success: true,
      ticker: ticker,
      articles,
      sentiment: sentimentData,
      articleCount: articles.length
    });
  } catch (error) {
    console.error('Error fetching news sentiment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

