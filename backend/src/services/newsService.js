import axios from 'axios';
import dotenv from 'dotenv';
import { EnvValidator } from '../utils/envValidator.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { Cache } from '../utils/cache.js';
import { Retry } from '../utils/retry.js';

dotenv.config();

const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
const NEWS_API_BASE_URL = process.env.NEWS_API_BASE_URL || 'https://newsapi.org/v2';
const RATE_LIMIT = parseInt(process.env.NEWS_API_RATE_LIMIT) || 100; // requests per minute
const CACHE_TTL = parseInt(process.env.CACHE_TTL_NEWS) || 300; // 5 minutes default

// Initialize rate limiter and cache
const rateLimiter = new RateLimiter(RATE_LIMIT, 60000); // 60 seconds window
const cache = new Cache(CACHE_TTL);

// Validate API key on module load
if (!NEWS_API_KEY || NEWS_API_KEY.includes('your_') || NEWS_API_KEY.includes('_here')) {
  console.warn('⚠️  NEWS_API_KEY is not configured. News features may not work properly.');
  console.warn('   Please set NEWS_API_KEY in your .env file. Get your key from https://newsapi.org/');
}

// Clean expired cache entries periodically
setInterval(() => cache.clearExpired(), 60000); // Every minute

export class NewsService {
  /**
   * Check if API key is configured
   */
  static isConfigured() {
    return NEWS_API_KEY && !NEWS_API_KEY.includes('your_') && !NEWS_API_KEY.includes('_here');
  }

  /**
   * Make API request with rate limiting, caching, and retry logic
   * @private
   */
  static async makeRequest(cacheKey, requestFn) {
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check rate limit
    if (!rateLimiter.isAllowed('news-api')) {
      const waitTime = rateLimiter.getTimeUntilNext('news-api');
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
    cache.set(cacheKey, result);
    return result;
  }
  /**
   * Fetch news articles for a specific ticker
   * @param {string} ticker - Stock ticker symbol
   * @param {number} days - Number of days to look back (default: 7)
   * @returns {Promise<Array>} Array of news articles
   */
  static async fetchNewsForTicker(ticker, days = 7) {
    if (!this.isConfigured()) {
      throw new Error('News API key is not configured. Please set NEWS_API_KEY in your .env file.');
    }

    const cacheKey = `news:ticker:${ticker.toUpperCase()}:${days}`;

    try {
      return await this.makeRequest(cacheKey, async () => {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        const fromDateStr = fromDate.toISOString().split('T')[0];
        
        const response = await axios.get(`${NEWS_API_BASE_URL}/everything`, {
          params: {
            q: ticker,
            from: fromDateStr,
            sortBy: 'publishedAt',
            language: 'en',
            apiKey: NEWS_API_KEY,
            pageSize: 100
          },
          timeout: 10000
        });

        if (response.data.status === 'ok' && response.data.articles) {
          return response.data.articles.map(article => ({
            title: article.title,
            description: article.description,
            content: article.content,
            url: article.url,
            publishedAt: article.publishedAt,
            source: article.source?.name || 'Unknown',
            ticker: ticker
          }));
        }

        if (response.data.status === 'error') {
          throw new Error(response.data.message || 'News API error');
        }

        return [];
      });
    } catch (error) {
      // Return cached data if available, even if expired, as fallback
      const cached = cache.get(cacheKey);
      if (cached) {
        console.warn(`Using cached news data for ${ticker} due to API error:`, error.message);
        return cached;
      }

      console.error(`Error fetching news for ${ticker}:`, error.message);
      
      // Provide helpful error messages
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Invalid News API key. Please check your NEWS_API_KEY in .env file.');
        } else if (error.response.status === 429) {
          throw new Error('News API rate limit exceeded. Please try again later.');
        } else if (error.response.status >= 500) {
          throw new Error('News API server error. Please try again later.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Fetch general business news
   * @param {number} limit - Number of articles to fetch
   * @returns {Promise<Array>} Array of news articles
   */
  static async fetchBusinessNews(limit = 20) {
    if (!this.isConfigured()) {
      throw new Error('News API key is not configured. Please set NEWS_API_KEY in your .env file.');
    }

    const cacheKey = `news:business:${limit}`;

    try {
      return await this.makeRequest(cacheKey, async () => {
        const response = await axios.get(`${NEWS_API_BASE_URL}/top-headlines`, {
          params: {
            category: 'business',
            country: 'us',
            apiKey: NEWS_API_KEY,
            pageSize: limit
          },
          timeout: 10000
        });

        if (response.data.status === 'ok' && response.data.articles) {
          return response.data.articles.map(article => ({
            title: article.title,
            description: article.description,
            content: article.content,
            url: article.url,
            publishedAt: article.publishedAt,
            source: article.source?.name || 'Unknown'
          }));
        }

        if (response.data.status === 'error') {
          throw new Error(response.data.message || 'News API error');
        }

        return [];
      });
    } catch (error) {
      // Return cached data if available
      const cached = cache.get(cacheKey);
      if (cached) {
        console.warn('Using cached business news due to API error:', error.message);
        return cached;
      }

      console.error('Error fetching business news:', error.message);
      
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Invalid News API key. Please check your NEWS_API_KEY in .env file.');
        } else if (error.response.status === 429) {
          throw new Error('News API rate limit exceeded. Please try again later.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Search news by query
   * @param {string} query - Search query
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} Array of news articles
   */
  static async searchNews(query, days = 7) {
    if (!this.isConfigured()) {
      throw new Error('News API key is not configured. Please set NEWS_API_KEY in your .env file.');
    }

    const cacheKey = `news:search:${query.toLowerCase()}:${days}`;

    try {
      return await this.makeRequest(cacheKey, async () => {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        const fromDateStr = fromDate.toISOString().split('T')[0];
        
        const response = await axios.get(`${NEWS_API_BASE_URL}/everything`, {
          params: {
            q: query,
            from: fromDateStr,
            sortBy: 'publishedAt',
            language: 'en',
            apiKey: NEWS_API_KEY,
            pageSize: 50
          },
          timeout: 10000
        });

        if (response.data.status === 'ok' && response.data.articles) {
          return response.data.articles.map(article => ({
            title: article.title,
            description: article.description,
            content: article.content,
            url: article.url,
            publishedAt: article.publishedAt,
            source: article.source?.name || 'Unknown'
          }));
        }

        if (response.data.status === 'error') {
          throw new Error(response.data.message || 'News API error');
        }

        return [];
      });
    } catch (error) {
      // Return cached data if available
      const cached = cache.get(cacheKey);
      if (cached) {
        console.warn(`Using cached search results for "${query}" due to API error:`, error.message);
        return cached;
      }

      console.error(`Error searching news for "${query}":`, error.message);
      
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Invalid News API key. Please check your NEWS_API_KEY in .env file.');
        } else if (error.response.status === 429) {
          throw new Error('News API rate limit exceeded. Please try again later.');
        }
      }
      
      throw error;
    }
  }
}

