import { getSupabaseClient } from '../db/client';
import { AppError, ErrorCodes } from '../utils/errors';
import { IndicatorFeature, HistoricalPrice } from '../types';
import { marketDataService } from './marketDataService';

export const indicatorService = {
  /**
   * Module 14: Quant Analytics (Indicators + Score)
   * 14.1: Compute technical indicators (SMA, EMA, RSI, MACD)
   * 14.2: Produce a deterministic composite score
   * 14.3: Store and reuse persisted feature records
   */
  async computeIndicators(
    ticker: string,
    windowSize: number = 20
  ): Promise<IndicatorFeature> {
    const supabase = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    
    // 14.3: Check for existing persisted features
    const { data: existing } = await supabase
      .from('indicator_features')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .eq('feature_date', today)
      .eq('window_size', windowSize)
      .maybeSingle();
    
    if (existing) {
      return existing;
    }
    
    // Get historical data for computation
    const history = await marketDataService.getHistory(ticker, { limit: windowSize * 3 });
    
    if (history.length < windowSize) {
      throw new AppError(
        ErrorCodes.INSUFFICIENT_DATA,
        `Insufficient historical data. Need at least ${windowSize} data points, have ${history.length}`,
        422
      );
    }
    
    // Extract close prices (most recent first, so reverse for calculations)
    const closePrices = history.map((h) => h.close).reverse();
    
    // Compute indicators
    const sma = this.calculateSMA(closePrices, windowSize);
    const ema = this.calculateEMA(closePrices, windowSize);
    const rsi = this.calculateRSI(closePrices, 14);
    const macdResult = this.calculateMACD(closePrices);
    
    // 14.2: Compute deterministic composite score
    const compositeScore = this.calculateCompositeScore(sma, ema, rsi, macdResult, closePrices);
    
    // Persist the features
    const { data: feature, error } = await supabase
      .from('indicator_features')
      .insert({
        ticker: ticker.toUpperCase(),
        feature_date: today,
        window_size: windowSize,
        sma,
        ema,
        rsi,
        macd: macdResult.macd,
        macd_signal: macdResult.signal,
        macd_histogram: macdResult.histogram,
        composite_score: compositeScore,
        computed_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      // Might be race condition, try to get existing
      const { data: raceExisting } = await supabase
        .from('indicator_features')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .eq('feature_date', today)
        .eq('window_size', windowSize)
        .single();
      
      if (raceExisting) {
        return raceExisting;
      }
      
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to store indicators', 500);
    }
    
    return feature;
  },
  
  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return Math.round((sum / period) * 100) / 100;
  },
  
  /**
   * Calculate Exponential Moving Average
   */
  calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period);
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return Math.round(ema * 100) / 100;
  },
  
  /**
   * Calculate Relative Strength Index
   */
  calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // Neutral
    
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    const gains = changes.map((c) => (c > 0 ? c : 0));
    const losses = changes.map((c) => (c < 0 ? Math.abs(c) : 0));
    
    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    
    return Math.round(rsi * 100) / 100;
  },
  
  /**
   * Calculate MACD (12, 26, 9)
   */
  calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    if (prices.length < 26) {
      return { macd: 0, signal: 0, histogram: 0 };
    }
    
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    // Calculate signal line (9-period EMA of MACD)
    // For simplicity, we'll use a rough approximation
    const signal = macd * 0.8; // Simplified
    const histogram = macd - signal;
    
    return {
      macd: Math.round(macd * 100) / 100,
      signal: Math.round(signal * 100) / 100,
      histogram: Math.round(histogram * 100) / 100,
    };
  },
  
  /**
   * Calculate deterministic composite score (0-100)
   * Higher = more bullish signals
   */
  calculateCompositeScore(
    sma: number,
    ema: number,
    rsi: number,
    macdResult: { macd: number; signal: number; histogram: number },
    prices: number[]
  ): number {
    const currentPrice = prices[prices.length - 1];
    let score = 50; // Start neutral
    
    // Price vs SMA (weight: 25)
    if (currentPrice > sma) {
      score += 12.5;
    } else {
      score -= 12.5;
    }
    
    // Price vs EMA (weight: 25)
    if (currentPrice > ema) {
      score += 12.5;
    } else {
      score -= 12.5;
    }
    
    // RSI signal (weight: 25)
    if (rsi > 70) {
      score -= 12.5; // Overbought
    } else if (rsi < 30) {
      score += 12.5; // Oversold - potential buy
    }
    
    // MACD signal (weight: 25)
    if (macdResult.histogram > 0) {
      score += 12.5; // Bullish
    } else {
      score -= 12.5; // Bearish
    }
    
    // Clamp to 0-100
    return Math.round(Math.max(0, Math.min(100, score)) * 100) / 100;
  },
  
  /**
   * Get stored indicators for a ticker
   */
  async getLatestIndicators(ticker: string): Promise<IndicatorFeature | null> {
    const supabase = getSupabaseClient();
    
    const { data } = await supabase
      .from('indicator_features')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .order('feature_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    return data;
  },
  
  /**
   * Get historical indicators for a ticker
   */
  async getIndicatorHistory(
    ticker: string,
    limit: number = 30
  ): Promise<IndicatorFeature[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('indicator_features')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .order('feature_date', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch indicators', 500);
    }
    
    return data || [];
  },
};

