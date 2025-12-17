import { AppError, ErrorCodes } from '../utils/errors';
import { Explanation, ExplanationRequest } from '../types';
import { indicatorService } from './indicatorService';
import { newsService } from './newsService';

export const explainabilityService = {
  /**
   * Module 16: Explainability (Grounded)
   * 16.1: Explanations MUST reference only stored indicator/context fields and stored news aggregates
   * 16.2: Refuse unverifiable claims (return "insufficient_data" error if needed)
   */
  async getExplanation(request: ExplanationRequest): Promise<Explanation> {
    const ticker = request.ticker.toUpperCase();
    const date = request.date || new Date().toISOString().split('T')[0];
    
    // Get stored indicators
    const indicators = await indicatorService.getLatestIndicators(ticker);
    
    // Get stored news aggregate
    const newsAggregate = await newsService.getDailyAggregate(ticker, date);
    
    // 16.2: Check if we have sufficient data
    if (!indicators && !newsAggregate) {
      return {
        ticker,
        date,
        indicators: null,
        sentiment: null,
        summary: 'Insufficient data available for analysis.',
        confidence: 'insufficient_data',
      };
    }
    
    // Build grounded explanation
    const explanationParts: string[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let dataPoints = 0;
    
    // 16.1: Reference only stored indicator fields
    let indicatorData = null;
    if (indicators) {
      indicatorData = {
        sma: indicators.sma ? parseFloat(indicators.sma) : undefined,
        ema: indicators.ema ? parseFloat(indicators.ema) : undefined,
        rsi: indicators.rsi ? parseFloat(indicators.rsi) : undefined,
        macd: indicators.macd ? parseFloat(indicators.macd) : undefined,
        composite_score: indicators.composite_score ? parseFloat(indicators.composite_score) : undefined,
      };
      
      dataPoints++;
      
      // Build technical analysis summary
      if (indicatorData.composite_score !== undefined) {
        if (indicatorData.composite_score >= 70) {
          explanationParts.push(`Technical indicators show bullish signals (score: ${indicatorData.composite_score}/100).`);
        } else if (indicatorData.composite_score <= 30) {
          explanationParts.push(`Technical indicators show bearish signals (score: ${indicatorData.composite_score}/100).`);
        } else {
          explanationParts.push(`Technical indicators are neutral (score: ${indicatorData.composite_score}/100).`);
        }
      }
      
      if (indicatorData.rsi !== undefined) {
        if (indicatorData.rsi > 70) {
          explanationParts.push(`RSI at ${indicatorData.rsi} suggests overbought conditions.`);
        } else if (indicatorData.rsi < 30) {
          explanationParts.push(`RSI at ${indicatorData.rsi} suggests oversold conditions.`);
        }
      }
    }
    
    // 16.1: Reference only stored news aggregate fields
    let sentimentData = null;
    if (newsAggregate) {
      const avgSentiment = newsAggregate.avg_sentiment ? parseFloat(newsAggregate.avg_sentiment) : null;
      const totalArticles = newsAggregate.article_count;
      const positiveRatio = totalArticles > 0 ? newsAggregate.positive_count / totalArticles : 0;
      
      sentimentData = {
        avg_sentiment: avgSentiment,
        article_count: totalArticles,
        positive_ratio: Math.round(positiveRatio * 100) / 100,
      };
      
      dataPoints++;
      
      // Build sentiment summary
      if (totalArticles > 0) {
        if (avgSentiment !== null && avgSentiment > 0.2) {
          explanationParts.push(`News sentiment is positive (${newsAggregate.positive_count}/${totalArticles} articles positive).`);
        } else if (avgSentiment !== null && avgSentiment < -0.2) {
          explanationParts.push(`News sentiment is negative (${newsAggregate.negative_count}/${totalArticles} articles negative).`);
        } else {
          explanationParts.push(`News sentiment is mixed or neutral (${totalArticles} articles analyzed).`);
        }
      }
    }
    
    // Determine confidence level based on available data
    if (dataPoints >= 2 && (newsAggregate?.article_count || 0) >= 3) {
      confidence = 'high';
    } else if (dataPoints >= 1) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
    
    // Build final summary
    let summary: string;
    if (explanationParts.length === 0) {
      summary = 'Limited data available. Analysis based on available stored records only.';
      confidence = 'low';
    } else {
      summary = explanationParts.join(' ');
    }
    
    return {
      ticker,
      date,
      indicators: indicatorData,
      sentiment: sentimentData,
      summary,
      confidence,
    };
  },
  
  /**
   * Get explanation for multiple tickers
   */
  async getMultipleExplanations(tickers: string[], date?: string): Promise<Explanation[]> {
    return Promise.all(
      tickers.map((ticker) => this.getExplanation({ ticker, date }))
    );
  },
};

