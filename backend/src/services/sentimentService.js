import axios from 'axios';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SENTIMENT_SCRIPT_PATH = path.join(__dirname, '../../../../quant-engine/src/sentiment.py');

export class SentimentService {
  /**
   * Analyze sentiment for a single text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Sentiment analysis result
   */
  static async analyzeSentiment(text) {
    if (!text || text.trim().length === 0) {
      return { score: 0.5, label: 'neutral' };
    }

    try {
      // Use Python sentiment analysis script
      const result = await this.callSentimentScript(text);
      return result;
    } catch (error) {
      console.error('Error in sentiment analysis:', error);
      // Fallback to simple keyword-based sentiment
      return this.fallbackSentiment(text);
    }
  }

  /**
   * Analyze sentiment for multiple news articles
   * @param {Array} articles - Array of news articles
   * @returns {Promise<Object>} Aggregated sentiment metrics
   */
  static async analyzeNewsSentiment(articles) {
    if (!articles || articles.length === 0) {
      return {
        sentMean_3d: 0.5,
        sentShock: 0.0,
        sentVsPrice: 0.0,
        articleCount: 0
      };
    }

    try {
      // Extract text from articles
      const texts = articles.map(article => {
        const content = article.content || article.description || article.title || '';
        return content.substring(0, 1000); // Limit length
      });

      // Analyze sentiment for each article
      const sentiments = await Promise.all(
        texts.map(text => this.analyzeSentiment(text))
      );

      // Calculate 3-day mean sentiment
      const recentArticles = articles.slice(0, Math.min(articles.length, 20));
      const recentSentiments = sentiments.slice(0, recentArticles.length);
      const sentMean_3d = recentSentiments.length > 0
        ? recentSentiments.reduce((sum, s) => sum + s.score, 0) / recentSentiments.length
        : 0.5;

      // Calculate sentiment shock (deviation from 7-day average)
      const sevenDaySentiments = sentiments.slice(0, Math.min(sentiments.length, 50));
      const sevenDayMean = sevenDaySentiments.length > 0
        ? sevenDaySentiments.reduce((sum, s) => sum + s.score, 0) / sevenDaySentiments.length
        : 0.5;
      const sentShock = Math.abs(sentMean_3d - sevenDayMean);

      // Return individual sentiment scores (not objects) for easier correlation calculation
      const sentimentScores = sentiments.map(s => typeof s === 'object' ? s.score : s);
      
      return {
        sentMean_3d: sentMean_3d,
        sentShock: sentShock,
        sentVsPrice: 0.0, // Will be calculated when price data is available
        articleCount: articles.length,
        individualSentiments: sentimentScores // Store as array of numbers for easier correlation
      };
    } catch (error) {
      console.error('Error analyzing news sentiment:', error);
      return {
        sentMean_3d: 0.5,
        sentShock: 0.0,
        sentVsPrice: 0.0,
        articleCount: 0
      };
    }
  }

  /**
   * Calculate sentiment-price correlation
   * @param {Array} sentimentHistory - Historical sentiment scores
   * @param {Array} priceHistory - Historical price changes
   * @returns {number} Correlation coefficient
   */
  static calculateSentimentPriceCorrelation(sentimentHistory, priceHistory) {
    if (!sentimentHistory || !priceHistory || sentimentHistory.length !== priceHistory.length) {
      return 0.0;
    }

    const n = sentimentHistory.length;
    if (n < 2) return 0.0;

    const meanSent = sentimentHistory.reduce((a, b) => a + b, 0) / n;
    const meanPrice = priceHistory.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomSent = 0;
    let denomPrice = 0;

    for (let i = 0; i < n; i++) {
      const sentDiff = sentimentHistory[i] - meanSent;
      const priceDiff = priceHistory[i] - meanPrice;
      numerator += sentDiff * priceDiff;
      denomSent += sentDiff * sentDiff;
      denomPrice += priceDiff * priceDiff;
    }

    const denominator = Math.sqrt(denomSent * denomPrice);
    return denominator === 0 ? 0.0 : numerator / denominator;
  }

  /**
   * Call Python sentiment analysis script
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Sentiment result
   */
  static async callSentimentScript(text) {
    return new Promise((resolve, reject) => {
      // Check if sentiment script exists
      if (!fs.existsSync(SENTIMENT_SCRIPT_PATH)) {
        // Fallback if script doesn't exist
        resolve(this.fallbackSentiment(text));
        return;
      }

      const pythonCmd = process.platform !== 'win32' ? 'python3' : 'python';
      const python = spawn(pythonCmd, [
        SENTIMENT_SCRIPT_PATH,
        text.substring(0, 2000) // Limit text length
      ]);

      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          // Fallback on error
          resolve(this.fallbackSentiment(text));
        } else {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (e) {
            resolve(this.fallbackSentiment(text));
          }
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        python.kill();
        resolve(this.fallbackSentiment(text));
      }, 10000);
    });
  }

  /**
   * Fallback keyword-based sentiment analysis
   * @param {string} text - Text to analyze
   * @returns {Object} Sentiment result
   */
  static fallbackSentiment(text) {
    const lowerText = text.toLowerCase();
    
    // Positive keywords
    const positiveKeywords = [
      'surge', 'rally', 'gain', 'rise', 'up', 'growth', 'profit', 'success',
      'strong', 'bullish', 'outperform', 'beat', 'exceed', 'positive', 'optimistic',
      'breakthrough', 'innovation', 'expansion', 'record', 'high'
    ];
    
    // Negative keywords
    const negativeKeywords = [
      'drop', 'fall', 'decline', 'loss', 'down', 'crash', 'plunge', 'fail',
      'weak', 'bearish', 'underperform', 'miss', 'negative', 'pessimistic',
      'concern', 'risk', 'worry', 'uncertainty', 'volatility', 'crisis'
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) positiveCount += matches.length;
    });

    negativeKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) negativeCount += matches.length;
    });

    // Calculate score (0 = negative, 1 = positive)
    const total = positiveCount + negativeCount;
    let score = 0.5; // Neutral default
    
    if (total > 0) {
      score = 0.5 + (positiveCount - negativeCount) / (total * 2);
      score = Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
    }

    let label = 'neutral';
    if (score > 0.6) label = 'positive';
    else if (score < 0.4) label = 'negative';

    return { score, label, positiveCount, negativeCount };
  }
}

