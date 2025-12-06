import express from 'express';
import { TwelveDataService } from '../services/twelveDataService.js';
import { validateTicker, validateNumericQuery, validateDate } from '../middleware/validator.js';

const router = express.Router();

/**
 * GET /api/market-data/quote/:ticker
 * Get real-time quote for a ticker
 */
router.get('/quote/:ticker', validateTicker, async (req, res) => {
  try {
    const ticker = req.validatedTicker || req.params.ticker.toUpperCase();
    const quote = await TwelveDataService.getRealTimeQuote(ticker);
    
    res.json({
      success: true,
      quote
    });
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/market-data/timeseries/:ticker
 * Get time series data for a ticker
 */
router.get('/timeseries/:ticker', validateTicker, validateNumericQuery(['outputsize']), async (req, res) => {
  try {
    const ticker = req.validatedTicker || req.params.ticker.toUpperCase();
    const interval = req.query.interval || '1day';
    const outputsize = req.query.outputsize || 100;
    
    const data = await TwelveDataService.getTimeSeries(ticker, interval, outputsize);
    
    res.json({
      success: true,
      ticker: ticker,
      interval,
      data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching time series:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/market-data/historical/:ticker
 * Get historical data for a ticker
 */
router.get('/historical/:ticker', validateTicker, validateDate('start_date'), validateDate('end_date'), async (req, res) => {
  try {
    const ticker = req.validatedTicker || req.params.ticker.toUpperCase();
    const { start_date, end_date, interval } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date query parameters are required (YYYY-MM-DD format)'
      });
    }
    
    const data = await TwelveDataService.getHistoricalData(
      ticker,
      start_date,
      end_date,
      interval || '1day'
    );
    
    res.json({
      success: true,
      ticker: ticker,
      start_date,
      end_date,
      interval: interval || '1day',
      data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/market-data/quotes
 * Get multiple real-time quotes
 */
router.post('/quotes', async (req, res) => {
  try {
    const { tickers } = req.body;
    
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'tickers must be a non-empty array'
      });
    }
    
    const quotes = await TwelveDataService.getMultipleQuotes(tickers);
    
    res.json({
      success: true,
      quotes,
      count: quotes.length
    });
  } catch (error) {
    console.error('Error fetching multiple quotes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

