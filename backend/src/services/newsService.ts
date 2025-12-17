import { getSupabaseClient } from '../db/client';
import { AppError, ErrorCodes } from '../utils/errors';
import { NewsArticle, NewsDailyAggregate, SentimentLabel } from '../types';

export const newsService = {
  /**
   * Module 15: News + Sentiment Pipeline
   * 15.1: Ingest ticker-linked news
   * 15.2: Score sentiment per article and persist
   */
  async ingestArticle(article: {
    ticker: string;
    source: string;
    headline: string;
    summary?: string;
    url?: string;
    published_at: string;
  }): Promise<NewsArticle> {
    const supabase = getSupabaseClient();
    
    // Score sentiment
    const { score, label } = this.scoreSentiment(article.headline, article.summary);
    
    const { data, error } = await supabase
      .from('news_articles')
      .upsert(
        {
          ticker: article.ticker.toUpperCase(),
          source: article.source,
          headline: article.headline,
          summary: article.summary || null,
          url: article.url || null,
          published_at: article.published_at,
          sentiment_score: score,
          sentiment_label: label,
          ingested_at: new Date().toISOString(),
        },
        { onConflict: 'ticker,url' }
      )
      .select()
      .single();
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to ingest article', 500);
    }
    
    // Update daily aggregate
    await this.updateDailyAggregate(article.ticker, article.published_at.split('T')[0]);
    
    return data;
  },
  
  /**
   * 15.2: Score sentiment per article
   * Simple keyword-based scoring for demo; production would use ML model
   */
  scoreSentiment(headline: string, summary?: string): { score: number; label: SentimentLabel } {
    const text = `${headline} ${summary || ''}`.toLowerCase();
    
    // Positive keywords
    const positiveWords = [
      'surge', 'soar', 'gain', 'rally', 'jump', 'rise', 'growth', 'profit',
      'beat', 'exceed', 'strong', 'bullish', 'upgrade', 'buy', 'outperform',
      'record', 'high', 'breakthrough', 'success', 'positive', 'boost',
    ];
    
    // Negative keywords
    const negativeWords = [
      'drop', 'fall', 'plunge', 'crash', 'decline', 'loss', 'miss', 'weak',
      'bearish', 'downgrade', 'sell', 'underperform', 'low', 'fail', 'negative',
      'concern', 'risk', 'warning', 'layoff', 'cut', 'slump', 'tumble',
    ];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const word of positiveWords) {
      if (text.includes(word)) positiveCount++;
    }
    
    for (const word of negativeWords) {
      if (text.includes(word)) negativeCount++;
    }
    
    const total = positiveCount + negativeCount;
    if (total === 0) {
      return { score: 0, label: 'NEUTRAL' };
    }
    
    // Score from -1 to 1
    const score = (positiveCount - negativeCount) / total;
    const roundedScore = Math.round(score * 1000) / 1000;
    
    let label: SentimentLabel;
    if (score > 0.2) {
      label = 'POSITIVE';
    } else if (score < -0.2) {
      label = 'NEGATIVE';
    } else {
      label = 'NEUTRAL';
    }
    
    return { score: roundedScore, label };
  },
  
  /**
   * 15.3: Maintain daily aggregates with provenance
   */
  async updateDailyAggregate(ticker: string, date: string): Promise<NewsDailyAggregate> {
    const supabase = getSupabaseClient();
    
    // Get all articles for this ticker and date
    const { data: articles } = await supabase
      .from('news_articles')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .gte('published_at', `${date}T00:00:00Z`)
      .lte('published_at', `${date}T23:59:59Z`);
    
    const articleList = articles || [];
    
    // Calculate aggregates
    const articleCount = articleList.length;
    const sources = [...new Set(articleList.map((a) => a.source))];
    
    let totalSentiment = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    
    for (const article of articleList) {
      if (article.sentiment_score !== null) {
        totalSentiment += parseFloat(article.sentiment_score);
      }
      if (article.sentiment_label === 'POSITIVE') positiveCount++;
      else if (article.sentiment_label === 'NEGATIVE') negativeCount++;
      else neutralCount++;
    }
    
    const avgSentiment = articleCount > 0 ? totalSentiment / articleCount : null;
    
    const { data, error } = await supabase
      .from('news_daily_aggregates')
      .upsert(
        {
          ticker: ticker.toUpperCase(),
          aggregate_date: date,
          article_count: articleCount,
          avg_sentiment: avgSentiment !== null ? Math.round(avgSentiment * 1000) / 1000 : null,
          positive_count: positiveCount,
          negative_count: negativeCount,
          neutral_count: neutralCount,
          sources: sources,
          computed_at: new Date().toISOString(),
        },
        { onConflict: 'ticker,aggregate_date' }
      )
      .select()
      .single();
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update daily aggregate', 500);
    }
    
    return data;
  },
  
  /**
   * Get articles for a ticker
   */
  async getArticles(
    ticker: string,
    options: { limit?: number; startDate?: string; endDate?: string } = {}
  ): Promise<NewsArticle[]> {
    const supabase = getSupabaseClient();
    const limit = options.limit || 50;
    
    let query = supabase
      .from('news_articles')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .order('published_at', { ascending: false })
      .limit(limit);
    
    if (options.startDate) {
      query = query.gte('published_at', `${options.startDate}T00:00:00Z`);
    }
    if (options.endDate) {
      query = query.lte('published_at', `${options.endDate}T23:59:59Z`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch articles', 500);
    }
    
    return data || [];
  },
  
  /**
   * Get daily aggregate for a ticker
   */
  async getDailyAggregate(ticker: string, date: string): Promise<NewsDailyAggregate | null> {
    const supabase = getSupabaseClient();
    
    const { data } = await supabase
      .from('news_daily_aggregates')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .eq('aggregate_date', date)
      .maybeSingle();
    
    return data;
  },
  
  /**
   * Get aggregate history for a ticker
   */
  async getAggregateHistory(
    ticker: string,
    limit: number = 30
  ): Promise<NewsDailyAggregate[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('news_daily_aggregates')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .order('aggregate_date', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch aggregates', 500);
    }
    
    return data || [];
  },
};

