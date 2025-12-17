import NodeCache from 'node-cache';
import { getSupabaseClient } from '../db/client';
import { AppError, ErrorCodes } from '../utils/errors';
import { Quote, HistoricalPrice } from '../types';
import { config } from '../config';

// In-memory cache for market data
const cache = new NodeCache({ stdTTL: config.marketData.cacheTtlSeconds });

// Mock price generator for deterministic testing
function generateMockPrice(ticker: string, basePrice?: number): number {
  const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const base = basePrice || 100 + (hash % 900);
  const variation = (hash % 100) / 1000;
  return Math.round((base + base * variation) * 100) / 100;
}

export const marketDataService = {
  /**
   * Module 13: Market Data Integration
   * 13.1: Fetch quote reliably (provider adapter)
   * 13.2: Add caching + graceful handling
   * 13.3: Return readable, structured responses
   */
  async getQuote(ticker: string): Promise<Quote> {
    const cacheKey = `quote:${ticker}`;
    
    // Check cache first
    const cached = cache.get<Quote>(cacheKey);
    if (cached) {
      return cached;
    }
    
    let quote: Quote;
    
    if (config.marketData.provider === 'mock') {
      // Mock provider for development/testing
      const price = generateMockPrice(ticker);
      const change = (Math.random() - 0.5) * 10;
      
      quote = {
        ticker: ticker.toUpperCase(),
        price,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round((change / price) * 10000) / 100,
        volume: Math.floor(Math.random() * 10000000),
        timestamp: new Date().toISOString(),
      };
    } else {
      // TODO: Implement real market data provider (Alpha Vantage, Yahoo Finance, etc.)
      throw new AppError(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'Real market data provider not configured',
        503
      );
    }
    
    // Cache the result
    cache.set(cacheKey, quote);
    
    // Also persist to database for historical reference
    await this.cachePrice(quote);
    
    return quote;
  },
  
  /**
   * Get quotes for multiple tickers
   */
  async getQuotes(tickers: string[]): Promise<Record<string, Quote>> {
    const quotes: Record<string, Quote> = {};
    
    await Promise.all(
      tickers.map(async (ticker) => {
        try {
          quotes[ticker] = await this.getQuote(ticker);
        } catch (error) {
          // Log but don't fail - return what we can
          console.warn(`Failed to get quote for ${ticker}:`, error);
        }
      })
    );
    
    return quotes;
  },
  
  /**
   * Get historical price data
   */
  async getHistory(
    ticker: string,
    options: { startDate?: string; endDate?: string; limit?: number } = {}
  ): Promise<HistoricalPrice[]> {
    const supabase = getSupabaseClient();
    const limit = options.limit || 30;
    
    // Try to get from cache first
    let query = supabase
      .from('market_prices_cache')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .order('price_date', { ascending: false })
      .limit(limit);
    
    if (options.startDate) {
      query = query.gte('price_date', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('price_date', options.endDate);
    }
    
    const { data: cachedPrices } = await query;
    
    if (cachedPrices && cachedPrices.length > 0) {
      return cachedPrices.map((p) => ({
        date: p.price_date,
        open: parseFloat(p.open_price || p.price),
        high: parseFloat(p.high_price || p.price),
        low: parseFloat(p.low_price || p.price),
        close: parseFloat(p.close_price || p.price),
        volume: p.volume || 0,
      }));
    }
    
    // Generate mock historical data if not cached
    if (config.marketData.provider === 'mock') {
      return this.generateMockHistory(ticker, limit);
    }
    
    throw new AppError(
      ErrorCodes.NOT_FOUND,
      'No historical data available for this ticker',
      404
    );
  },
  
  /**
   * Generate mock historical data
   */
  generateMockHistory(ticker: string, days: number): HistoricalPrice[] {
    const history: HistoricalPrice[] = [];
    let price = generateMockPrice(ticker);
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dailyChange = (Math.random() - 0.5) * 0.05;
      const open = price;
      const close = price * (1 + dailyChange);
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      
      history.push({
        date: date.toISOString().split('T')[0],
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: Math.floor(Math.random() * 10000000),
      });
      
      price = close;
    }
    
    return history;
  },
  
  /**
   * Cache price in database
   */
  async cachePrice(quote: Quote): Promise<void> {
    const supabase = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    const expiresAt = new Date(Date.now() + config.marketData.cacheTtlSeconds * 1000).toISOString();
    
    try {
      await supabase.from('market_prices_cache').upsert(
        {
          ticker: quote.ticker,
          price: quote.price,
          price_date: today,
          close_price: quote.price,
          volume: quote.volume,
          source: config.marketData.provider,
          fetched_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: 'ticker,price_date,source' }
      );
    } catch (error) {
      // Log but don't fail - caching is best-effort
      console.warn('Failed to cache price:', error);
    }
  },
  
  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    cache.flushAll();
  },
  
  /**
   * Get cached price for a ticker (for internal use)
   */
  async getCachedPrice(ticker: string): Promise<number | null> {
    const quote = cache.get<Quote>(`quote:${ticker}`);
    if (quote) {
      return quote.price;
    }
    
    const supabase = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('market_prices_cache')
      .select('price')
      .eq('ticker', ticker.toUpperCase())
      .eq('price_date', today)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();
    
    return data ? parseFloat(data.price) : null;
  },
};

