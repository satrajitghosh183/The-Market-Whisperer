import express from 'express';
import { QuantService } from '../services/quantService.js';
import { getAvailableTickers, loadStockData } from '../data/dataLayer.js';
import { TwelveDataService } from '../services/twelveDataService.js';

const router = express.Router();

// Get quant analysis for a ticker
router.get('/analysis/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const analysis = await QuantService.analyzeTicker(ticker);
    
    // Check if analysis has data
    if (!analysis || (analysis.indicators && Object.keys(analysis.indicators).length === 0 && !analysis.error)) {
      // If no data, provide helpful error
      const availableTickers = await getAvailableTickers();
      res.status(404).json({ 
        error: `No data available for ${ticker}. Available tickers: ${availableTickers.slice(0, 20).join(', ')}` 
      });
      return;
    }
    
    res.json(analysis);
  } catch (error) {
    console.error('Quant analysis error:', error);
    res.status(500).json({ error: `Failed to analyze ${req.params.ticker}: ${error.message}` });
  }
});

// Get available tickers
router.get('/tickers', async (req, res) => {
  try {
    const tickers = await getAvailableTickers();
    res.json({ tickers });
  } catch (error) {
    console.error('Tickers fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tickers' });
  }
});

// Get stock data - tries live data first, falls back to file data
router.get('/data/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { limit } = req.query;
    let data = [];
    let dataSource = 'file';
    
    // Try to get live data from Twelve Data API first
    try {
      if (TwelveDataService.isConfigured()) {
        const timeSeries = await TwelveDataService.getTimeSeries(ticker.toUpperCase(), '1day', limit ? parseInt(limit) : 200);
        if (timeSeries && timeSeries.length > 0) {
          // Convert to expected format
          data = timeSeries.map(item => ({
            ticker: ticker.toUpperCase(),
            date: item.datetime.split(' ')[0] || item.datetime,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume
          }));
          dataSource = 'live';
        }
      }
    } catch (apiError) {
      console.warn(`Live data fetch failed for ${ticker}, using file data:`, apiError.message);
    }
    
    // Fallback to file-based data
    if (data.length === 0) {
      data = await loadStockData(ticker);
      dataSource = 'file';
    }
    
    if (data.length === 0) {
      const availableTickers = await getAvailableTickers();
      res.status(404).json({ 
        error: `No historical data found for ${ticker}. Available tickers: ${availableTickers.slice(0, 20).join(', ')}`,
        ticker,
        data: [],
        dataSource: 'none'
      });
      return;
    }
    
    const result = limit ? data.slice(-parseInt(limit)) : data;
    res.json({ 
      ticker, 
      data: result, 
      count: result.length, 
      total: data.length,
      dataSource 
    });
  } catch (error) {
    console.error('Stock data fetch error:', error);
    res.status(500).json({ error: `Failed to fetch data for ${ticker}: ${error.message}` });
  }
});

export default router;

