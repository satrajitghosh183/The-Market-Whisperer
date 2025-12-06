import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { loadStockData, getAvailableTickers } from '../data/dataLayer.js';
import { TwelveDataService } from './twelveDataService.js';
import { LLMService } from './llmService.js';
import { NewsService } from './newsService.js';
import { SentimentService } from './sentimentService.js';
import { PolicyService } from './policyService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QUANT_ENGINE_PATH = path.join(__dirname, '../../../quant-engine/src/analyze.py');

export class QuantService {
  static async analyzeTicker(ticker) {
    try {
      // Try to get live data from Twelve Data API first, fallback to file data
      let data = [];
      try {
        if (TwelveDataService.isConfigured()) {
          // Get time series data from Twelve Data API
          const timeSeries = await TwelveDataService.getTimeSeries(ticker, '1day', 200);
          if (timeSeries && timeSeries.length > 0) {
            // Convert to format expected by quant engine
            data = timeSeries.map(item => ({
              ticker: ticker.toUpperCase(),
              date: item.datetime.split(' ')[0] || item.datetime,
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              volume: item.volume
            }));
            console.log(`✅ Using live data from Twelve Data API for ${ticker} (${data.length} data points)`);
          }
        }
      } catch (apiError) {
        console.warn(`Live data fetch failed for ${ticker}, using file data:`, apiError.message);
      }
      
      // Fallback to file-based data if API data is empty
      if (data.length === 0) {
        data = await loadStockData(ticker);
        if (data.length === 0) {
          throw new Error(`No data available for ${ticker}. Make sure the ticker exists or API is configured.`);
        }
        console.log(`⚠️  Using file-based data for ${ticker} (${data.length} data points)`);
      }
      
      // Fetch news articles for the ticker
      const newsArticles = await NewsService.fetchNewsForTicker(ticker, 7);
      
      // Analyze sentiment from news
      const sentimentData = await SentimentService.analyzeNewsSentiment(newsArticles);
      
      // Calculate sentiment-price correlation if we have price history
      if (data.length >= 7 && sentimentData.individualSentiments) {
        const recentPrices = data.slice(-7).map(d => d.close);
        const priceChanges = recentPrices.slice(1).map((p, i) => (p - recentPrices[i]) / recentPrices[i]);
        const recentSentiments = sentimentData.individualSentiments.slice(0, Math.min(6, sentimentData.individualSentiments.length));
        
        if (priceChanges.length === recentSentiments.length) {
          const sentScores = recentSentiments.map(s => s.score);
          sentimentData.sentVsPrice = SentimentService.calculateSentimentPriceCorrelation(sentScores, priceChanges);
        }
      }
      
      // Get policy context
      const policyData = PolicyService.getPolicyContext(ticker);
      
      // Call Python quant engine with sentiment and policy data
      const result = await this.callPythonEngine('analyze', {
        ticker,
        data,
        sentiment_data: {
          sentMean_3d: sentimentData.sentMean_3d,
          sentShock: sentimentData.sentShock,
          sentVsPrice: sentimentData.sentVsPrice || 0.0
        },
        policy_data: {
          policyTilt: policyData.policyTilt,
          fomcProximity: policyData.fomcProximity
        }
      });
      
      // Get explanation from LLM service
      const explanation = await LLMService.generateExplanation(
        ticker,
        result,
        result.indicators || {}
      );
      
      return {
        ticker,
        ...result,
        explanation,
        newsCount: newsArticles.length,
        sentiment: sentimentData,
        policy: policyData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error analyzing ${ticker}:`, error);
      // Fallback to basic analysis
      return this.fallbackAnalysis(ticker);
    }
  }
  
  static async callPythonEngine(method, params) {
    // Use temporary file to avoid ENAMETOOLONG error on Windows
    // Windows has a ~8191 character limit for command-line arguments
    const tempFile = path.join(os.tmpdir(), `quant_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
    
    try {
      // Write params to temp file
      fs.writeFileSync(tempFile, JSON.stringify(params), 'utf8');
      
      return new Promise((resolve, reject) => {
        // Use python3 if available, otherwise python
        const pythonCmd = process.platform !== 'win32' ? 'python3' : 'python';
        const python = spawn(pythonCmd, [
          QUANT_ENGINE_PATH,
          method,
          tempFile  // Pass file path instead of JSON string
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
          // Clean up temp file
          try {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
            }
          } catch (cleanupError) {
            console.warn('Failed to cleanup temp file:', cleanupError);
          }
          
          if (code !== 0) {
            reject(new Error(`Python process exited with code ${code}: ${error}`));
          } else {
            try {
              resolve(JSON.parse(output));
            } catch (e) {
              reject(new Error(`Failed to parse Python output: ${output}`));
            }
          }
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
          python.kill();
          try {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
            }
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
          reject(new Error('Python process timeout'));
        }, 30000);
      });
    } catch (error) {
      // Clean up temp file on error
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }
  
  static async fallbackAnalysis(ticker) {
    const data = await loadStockData(ticker);
    if (data.length === 0) {
      return {
        ticker,
        score: 0,
        indicators: {},
        recommendation: 'neutral',
        explanation: 'Insufficient data for analysis'
      };
    }
    
    const latest = data[data.length - 1];
    const prices = data.slice(-60).map(d => d.close);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const momentum = (latest.close - prices[0]) / prices[0];
    
    // Simplified scoring
    const score = momentum * 100;
    const recommendation = score > 5 ? 'long' : score < -5 ? 'short' : 'neutral';
    
    return {
      ticker,
      score,
      indicators: {
        momentum60: momentum,
        currentPrice: latest.close,
        avgPrice60: avgPrice
      },
      recommendation,
      explanation: `Simplified analysis: ${momentum > 0 ? 'positive' : 'negative'} momentum`
    };
  }
  
  static async generatePortfolioRecommendations({ numStocks = 20, benchmark = 'SPY' }) {
    try {
      const tickers = await getAvailableTickers();
      const analyses = await Promise.all(
        tickers.slice(0, numStocks * 2).map(ticker => this.analyzeTicker(ticker))
      );
      
      // Sort by score and take top N
      const sorted = analyses
        .filter(a => a.score !== undefined)
        .sort((a, b) => b.score - a.score)
        .slice(0, numStocks);
      
      // Generate weights (equal weight for simplicity)
      const weight = 1 / sorted.length;
      
      return sorted.map(analysis => ({
        ticker: analysis.ticker,
        score: analysis.score,
        recommendation: analysis.recommendation,
        weight,
        indicators: analysis.indicators
      }));
    } catch (error) {
      console.error('Portfolio generation error:', error);
      throw error;
    }
  }
  
  // This method is now deprecated in favor of LLMService
  // Keeping for backward compatibility
  static async getExplanation(ticker, analysis) {
    return await LLMService.generateExplanation(ticker, analysis, analysis.indicators || {});
  }
}

