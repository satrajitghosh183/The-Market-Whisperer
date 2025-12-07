// routes/stockRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

// @desc    Get stock quote
// @route   GET /api/stocks/quote/:ticker
// @access  Public
const getStockQuote = async (req, res) => {
    const { ticker } = req.params;
    
    try {
        // Using Yahoo Finance v8 API
        const response = await axios.get(
            `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`,
            {
                params: {
                    interval: '1d',
                    range: '1d',
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        );

        const data = response.data;
        
        if (data.chart?.result?.[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            const quotes = result.indicators?.quote?.[0];
            
            // Get the latest close price from the quotes
            const closes = quotes?.close || [];
            const opens = quotes?.open || [];
            const highs = quotes?.high || [];
            const lows = quotes?.low || [];
            const volumes = quotes?.volume || [];
            
            // Find the last non-null close price
            let currentPrice = null;
            for (let i = closes.length - 1; i >= 0; i--) {
                if (closes[i] !== null && closes[i] !== undefined && !isNaN(closes[i])) {
                    currentPrice = closes[i];
                    break;
                }
            }
            
            // Try regularMarketPrice if we don't have a close price
            if (!currentPrice || currentPrice === 0) {
                currentPrice = meta.regularMarketPrice;
            }
            
            // Fallback to previousClose
            if (!currentPrice || currentPrice === 0) {
                currentPrice = meta.previousClose || meta.chartPreviousClose;
            }
            
            const previousClose = meta.previousClose || meta.chartPreviousClose;
            const change = currentPrice - previousClose;
            const changePercent = (change / previousClose) * 100;
            
            // Get latest non-null values for other fields
            const getLatestValue = (arr) => {
                for (let i = arr.length - 1; i >= 0; i--) {
                    if (arr[i] !== null && arr[i] !== undefined && !isNaN(arr[i])) {
                        return arr[i];
                    }
                }
                return currentPrice;
            };
            
            const quoteData = {
                ticker: ticker.toUpperCase(),
                price: currentPrice,
                change: change,
                changePercent: changePercent,
                volume: meta.regularMarketVolume || getLatestValue(volumes) || 0,
                high: meta.regularMarketDayHigh || Math.max(...highs.filter(h => h !== null && !isNaN(h))) || currentPrice,
                low: meta.regularMarketDayLow || Math.min(...lows.filter(l => l !== null && !isNaN(l))) || currentPrice,
                open: meta.regularMarketOpen || getLatestValue(opens) || currentPrice,
                previousClose: previousClose,
            };
            
            console.log(`Stock quote for ${ticker}:`, quoteData);
            
            res.json(quoteData);
        } else {
            throw new Error('No data available from Yahoo Finance');
        }
        
    } catch (error) {
        console.error(`Error fetching quote for ${ticker}:`, error.message);
        res.status(500).json({ 
            message: 'Failed to fetch stock data',
            error: error.message 
        });
    }
};

router.get('/quote/:ticker', getStockQuote);

module.exports = router;

