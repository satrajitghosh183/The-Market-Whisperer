import axios from 'axios';
import dotenv from 'dotenv';
import { RateLimiter } from '../utils/rateLimiter.js';
import { Cache } from '../utils/cache.js';
import { Retry } from '../utils/retry.js';

dotenv.config();

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_BASE_URL = process.env.TWELVE_DATA_BASE_URL || 'https://api.twelvedata.com';
const RATE_LIMIT = parseInt(process.env.TWELVE_DATA_RATE_LIMIT) || 800; // requests per minute
const CACHE_TTL = parseInt(process.env.CACHE_TTL_QUOTES) || 60; // 1 minute default for quotes

// Initialize rate limiter and cache
const rateLimiter = new RateLimiter(RATE_LIMIT, 60000); // 60 seconds window
const quoteCache = new Cache(CACHE_TTL); // Short TTL for real-time quotes
const timeSeriesCache = new Cache(300); // 5 minutes for historical data

// Validate API key on module load
if (!TWELVE_DATA_API_KEY || TWELVE_DATA_API_KEY.includes('your_') || TWELVE_DATA_API_KEY.includes('_here')) {
  console.warn('⚠️  TWELVE_DATA_API_KEY is not configured. Stock data features may not work properly.');
  console.warn('   Please set TWELVE_DATA_API_KEY in your .env file. Get your key from https://twelvedata.com/');
}

// Clean expired cache entries periodically
setInterval(() => {
  quoteCache.clearExpired();
  timeSeriesCache.clearExpired();
}, 60000); // Every minute

export class TwelveDataService {
  /**
   * Check if API key is configured
   */
  static isConfigured() {
    return TWELVE_DATA_API_KEY && !TWELVE_DATA_API_KEY.includes('your_') && !TWELVE_DATA_API_KEY.includes('_here');
  }

  /**
   * Make API request with rate limiting, caching, and retry logic
   * @private
   */
  static async makeRequest(cacheKey, cache, requestFn, useCache = true) {
    // Check cache first
    if (useCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check rate limit
    if (!rateLimiter.isAllowed('twelve-data-api')) {
      const waitTime = rateLimiter.getTimeUntilNext('twelve-data-api');
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before retrying.`);
    }

    // Make request with retry logic
    const result = await Retry.withRetry(
      requestFn,
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        shouldRetry: Retry.isRetryableError
      }
    );

    // Cache the result
    if (useCache) {
      cache.set(cacheKey, result);
    }
    return result;
  }
  /**
   * Get real-time quote for a ticker
   * @param {string} ticker - Stock ticker symbol
   * @returns {Promise<Object>} Real-time quote data
   */
  static async getRealTimeQuote(ticker) {
    if (!this.isConfigured()) {
      throw new Error('Twelve Data API key is not configured. Please set TWELVE_DATA_API_KEY in your .env file.');
    }

    const cacheKey = `quote:${ticker.toUpperCase()}`;

    try {
      return await this.makeRequest(cacheKey, quoteCache, async () => {
        const response = await axios.get(`${TWELVE_DATA_BASE_URL}/quote`, {
          params: {
            symbol: ticker.toUpperCase(),
            apikey: TWELVE_DATA_API_KEY
          },
          timeout: 10000
        });

        if (response.data && response.data.symbol) {
          return {
            symbol: response.data.symbol,
            name: response.data.name,
            exchange: response.data.exchange,
            currency: response.data.currency,
            datetime: response.data.datetime,
            timestamp: response.data.timestamp,
            open: parseFloat(response.data.open),
            high: parseFloat(response.data.high),
            low: parseFloat(response.data.low),
            close: parseFloat(response.data.close),
            price: parseFloat(response.data.close), // Alias for convenience
            volume: parseInt(response.data.volume),
            previous_close: parseFloat(response.data.previous_close),
            change: parseFloat(response.data.change),
            percent_change: parseFloat(response.data.percent_change)
          };
        }

        if (response.data.status === 'error') {
          throw new Error(response.data.message || 'Twelve Data API error');
        }

        throw new Error('Invalid response from Twelve Data API');
      }, true); // Use cache for quotes
    } catch (error) {
      // Return cached data if available, even if expired
      const cached = quoteCache.get(cacheKey);
      if (cached) {
        console.warn(`Using cached quote for ${ticker} due to API error:`, error.message);
        return cached;
      }

      console.error(`Error fetching real-time quote for ${ticker}:`, error.message);
      
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Invalid Twelve Data API key. Please check your TWELVE_DATA_API_KEY in .env file.');
        } else if (error.response.status === 429) {
          throw new Error('Twelve Data API rate limit exceeded. Please try again later.');
        } else if (error.response.status >= 500) {
          throw new Error('Twelve Data API server error. Please try again later.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Get time series data for a ticker
   * @param {string} ticker - Stock ticker symbol
   * @param {string} interval - Time interval (1min, 5min, 15min, 30min, 45min, 1h, 2h, 4h, 1day, 1week, 1month)
   * @param {number} outputsize - Number of data points (default: 100)
   * @returns {Promise<Array>} Time series data
   */
  static async getTimeSeries(ticker, interval = '1day', outputsize = 100) {
    if (!this.isConfigured()) {
      throw new Error('Twelve Data API key is not configured. Please set TWELVE_DATA_API_KEY in your .env file.');
    }

    const cacheKey = `timeseries:${ticker.toUpperCase()}:${interval}:${outputsize}`;

    try {
      return await this.makeRequest(cacheKey, timeSeriesCache, async () => {
        const response = await axios.get(`${TWELVE_DATA_BASE_URL}/time_series`, {
          params: {
            symbol: ticker.toUpperCase(),
            interval: interval,
            outputsize: outputsize,
            apikey: TWELVE_DATA_API_KEY,
            format: 'JSON'
          },
          timeout: 10000
        });

        if (response.data && response.data.values) {
          return response.data.values.map(item => ({
            datetime: item.datetime,
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
            volume: parseInt(item.volume)
          })).reverse(); // Reverse to get chronological order
        }

        if (response.data.status === 'error') {
          throw new Error(response.data.message || 'Twelve Data API error');
        }

        return [];
      }, true); // Use cache for time series
    } catch (error) {
      // Return cached data if available
      const cached = timeSeriesCache.get(cacheKey);
      if (cached) {
        console.warn(`Using cached time series for ${ticker} due to API error:`, error.message);
        return cached;
      }

      console.error(`Error fetching time series for ${ticker}:`, error.message);
      
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Invalid Twelve Data API key. Please check your TWELVE_DATA_API_KEY in .env file.');
        } else if (error.response.status === 429) {
          throw new Error('Twelve Data API rate limit exceeded. Please try again later.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Get historical data (OHLCV) for a ticker
   * @param {string} ticker - Stock ticker symbol
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {string} interval - Time interval
   * @returns {Promise<Array>} Historical data
   */
  static async getHistoricalData(ticker, startDate, endDate, interval = '1day') {
    if (!this.isConfigured()) {
      throw new Error('Twelve Data API key is not configured. Please set TWELVE_DATA_API_KEY in your .env file.');
    }

    const cacheKey = `historical:${ticker.toUpperCase()}:${startDate}:${endDate}:${interval}`;

    try {
      return await this.makeRequest(cacheKey, timeSeriesCache, async () => {
        const response = await axios.get(`${TWELVE_DATA_BASE_URL}/time_series`, {
          params: {
            symbol: ticker.toUpperCase(),
            interval: interval,
            start_date: startDate,
            end_date: endDate,
            apikey: TWELVE_DATA_API_KEY,
            format: 'JSON'
          },
          timeout: 10000
        });

        if (response.data && response.data.values) {
          return response.data.values.map(item => ({
            date: item.datetime.split(' ')[0], // Extract date part
            datetime: item.datetime,
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
            volume: parseInt(item.volume)
          })).reverse();
        }

        if (response.data.status === 'error') {
          throw new Error(response.data.message || 'Twelve Data API error');
        }

        return [];
      }, true); // Use cache for historical data
    } catch (error) {
      // Return cached data if available
      const cached = timeSeriesCache.get(cacheKey);
      if (cached) {
        console.warn(`Using cached historical data for ${ticker} due to API error:`, error.message);
        return cached;
      }

      console.error(`Error fetching historical data for ${ticker}:`, error.message);
      
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Invalid Twelve Data API key. Please check your TWELVE_DATA_API_KEY in .env file.');
        } else if (error.response.status === 429) {
          throw new Error('Twelve Data API rate limit exceeded. Please try again later.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Get multiple real-time quotes
   * @param {Array<string>} tickers - Array of ticker symbols
   * @returns {Promise<Array>} Array of quotes
   */
  static async getMultipleQuotes(tickers) {
    if (!this.isConfigured()) {
      throw new Error('Twelve Data API key is not configured. Please set TWELVE_DATA_API_KEY in your .env file.');
    }

    // Try to get from cache first, then fetch missing ones
    const results = [];
    const missingTickers = [];

    for (const ticker of tickers) {
      const tickerUpper = ticker.toUpperCase();
      const cacheKey = `quote:${tickerUpper}`;
      const cached = quoteCache.get(cacheKey);
      if (cached) {
        results.push(cached);
      } else {
        missingTickers.push(tickerUpper);
      }
    }

    // If all are cached, return them
    if (missingTickers.length === 0) {
      return results;
    }

    // Fetch missing tickers
    try {
      const symbols = missingTickers.join(',');
      const response = await axios.get(`${TWELVE_DATA_BASE_URL}/quote`, {
        params: {
          symbol: symbols,
          apikey: TWELVE_DATA_API_KEY
        },
        timeout: 15000 // Longer timeout for multiple quotes
      });

      // Handle both single and multiple symbol responses
      const fetchedQuotes = [];
      if (Array.isArray(response.data)) {
        response.data.forEach(quote => {
          const quoteData = {
            symbol: quote.symbol,
            name: quote.name,
            close: parseFloat(quote.close),
            price: parseFloat(quote.close),
            change: parseFloat(quote.change),
            percent_change: parseFloat(quote.percent_change)
          };
          fetchedQuotes.push(quoteData);
          // Cache each quote
          quoteCache.set(`quote:${quote.symbol}`, quoteData);
        });
      } else if (response.data.symbol) {
        const quoteData = {
          symbol: response.data.symbol,
          name: response.data.name,
          close: parseFloat(response.data.close),
          price: parseFloat(response.data.close),
          change: parseFloat(response.data.change),
          percent_change: parseFloat(response.data.percent_change)
        };
        fetchedQuotes.push(quoteData);
        quoteCache.set(`quote:${response.data.symbol}`, quoteData);
      }

      // Combine cached and fetched results in original order
      const allResults = [];
      for (const ticker of tickers) {
        const tickerUpper = ticker.toUpperCase();
        const cached = quoteCache.get(`quote:${tickerUpper}`);
        if (cached) {
          allResults.push(cached);
        }
      }
      return allResults;
    } catch (error) {
      console.error('Error fetching multiple quotes:', error.message);
      
      // Return whatever we have from cache
      if (results.length > 0) {
        console.warn('Returning cached quotes due to API error');
        return results;
      }
      
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Invalid Twelve Data API key. Please check your TWELVE_DATA_API_KEY in .env file.');
        } else if (error.response.status === 429) {
          throw new Error('Twelve Data API rate limit exceeded. Please try again later.');
        }
      }
      
      throw error;
    }
  }
}

