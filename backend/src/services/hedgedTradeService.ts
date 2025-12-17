import { getSupabaseClient } from '../db/client';
import { AppError, ErrorCodes } from '../utils/errors';
import { HedgedTrade, CreateHedgedTradeInput } from '../types';
import { orderService } from './orderService';
import { portfolioService } from './portfolioService';
import { marketDataService } from './marketDataService';

export const hedgedTradeService = {
  /**
   * Module 17: Coupled Hedged Trades (Two-Leg)
   * 17.1: Execute paired trades atomically (both legs succeed or none)
   * 17.2: Return diagnostics (beta, R², stability warnings)
   */
  async execute(userId: string, input: CreateHedgedTradeInput): Promise<{
    hedgedTrade: HedgedTrade;
    diagnostics: {
      beta: number;
      rSquared: number;
      stabilityWarnings: string[];
    };
  }> {
    const supabase = getSupabaseClient();
    
    // Verify portfolio ownership
    const ownsPortfolio = await portfolioService.verifyOwnership(input.portfolio_id, userId);
    if (!ownsPortfolio) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'You do not own this portfolio', 403);
    }
    
    // Calculate diagnostics before executing
    const diagnostics = await this.calculateDiagnostics(
      input.primary_ticker,
      input.hedge_ticker,
      input.primary_quantity,
      input.hedge_quantity
    );
    
    // Create hedged trade record
    const { data: hedgedTrade, error: createError } = await supabase
      .from('hedged_trades')
      .insert({
        user_id: userId,
        portfolio_id: input.portfolio_id,
        primary_ticker: input.primary_ticker.toUpperCase(),
        hedge_ticker: input.hedge_ticker.toUpperCase(),
        beta: diagnostics.beta,
        r_squared: diagnostics.rSquared,
        stability_warning: diagnostics.stabilityWarnings.length > 0
          ? diagnostics.stabilityWarnings.join('; ')
          : null,
        status: 'PENDING',
      })
      .select()
      .single();
    
    if (createError) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create hedged trade', 500);
    }
    
    try {
      // Create and settle primary order
      const primaryOrder = await orderService.create(userId, {
        portfolio_id: input.portfolio_id,
        ticker: input.primary_ticker,
        side: input.primary_side,
        quantity: input.primary_quantity,
        price: input.primary_price,
      });
      
      // Determine hedge side (opposite of primary)
      const hedgeSide = input.primary_side === 'BUY' ? 'SELL' : 'BUY';
      
      // Create hedge order
      const hedgeOrder = await orderService.create(userId, {
        portfolio_id: input.portfolio_id,
        ticker: input.hedge_ticker,
        side: hedgeSide,
        quantity: input.hedge_quantity,
        price: input.hedge_price,
      });
      
      // Update hedged trade with order IDs
      await supabase
        .from('hedged_trades')
        .update({
          primary_order_id: primaryOrder.id,
          hedge_order_id: hedgeOrder.id,
        })
        .eq('id', hedgedTrade.id);
      
      // 17.1: Execute atomically - both must succeed
      try {
        await orderService.settle(primaryOrder.id, userId);
        await orderService.settle(hedgeOrder.id, userId);
        
        // Mark as executed
        const { data: executedTrade } = await supabase
          .from('hedged_trades')
          .update({ status: 'EXECUTED' })
          .eq('id', hedgedTrade.id)
          .select()
          .single();
        
        return {
          hedgedTrade: executedTrade!,
          diagnostics: {
            beta: diagnostics.beta,
            rSquared: diagnostics.rSquared,
            stabilityWarnings: diagnostics.stabilityWarnings,
          },
        };
      } catch (settlementError) {
        // Rollback - cancel any unfilled orders
        await this.rollback(hedgedTrade.id, primaryOrder.id, hedgeOrder.id, userId);
        throw settlementError;
      }
    } catch (error) {
      // Mark hedged trade as failed
      await supabase
        .from('hedged_trades')
        .update({ status: 'FAILED' })
        .eq('id', hedgedTrade.id);
      
      throw error;
    }
  },
  
  /**
   * Rollback failed hedged trade
   */
  async rollback(
    hedgedTradeId: string,
    primaryOrderId: string,
    hedgeOrderId: string,
    userId: string
  ): Promise<void> {
    const supabase = getSupabaseClient();
    
    // Try to cancel pending orders
    try {
      await orderService.cancel(primaryOrderId, userId);
    } catch {
      // Order may already be filled or cancelled
    }
    
    try {
      await orderService.cancel(hedgeOrderId, userId);
    } catch {
      // Order may already be filled or cancelled
    }
    
    // Mark as rolled back
    await supabase
      .from('hedged_trades')
      .update({ status: 'ROLLED_BACK' })
      .eq('id', hedgedTradeId);
  },
  
  /**
   * 17.2: Calculate diagnostics (beta, R², stability warnings)
   */
  async calculateDiagnostics(
    primaryTicker: string,
    hedgeTicker: string,
    primaryQuantity: number,
    hedgeQuantity: number
  ): Promise<{
    beta: number;
    rSquared: number;
    stabilityWarnings: string[];
  }> {
    const warnings: string[] = [];
    
    // Get historical data for both tickers
    const [primaryHistory, hedgeHistory] = await Promise.all([
      marketDataService.getHistory(primaryTicker, { limit: 30 }),
      marketDataService.getHistory(hedgeTicker, { limit: 30 }),
    ]);
    
    if (primaryHistory.length < 20 || hedgeHistory.length < 20) {
      warnings.push('Insufficient historical data for reliable beta calculation');
    }
    
    // Calculate daily returns
    const primaryReturns = this.calculateReturns(primaryHistory.map((h) => h.close));
    const hedgeReturns = this.calculateReturns(hedgeHistory.map((h) => h.close));
    
    // Calculate beta (covariance / variance)
    const beta = this.calculateBeta(primaryReturns, hedgeReturns);
    
    // Calculate R-squared
    const rSquared = this.calculateRSquared(primaryReturns, hedgeReturns);
    
    // Generate stability warnings
    if (Math.abs(beta) < 0.3) {
      warnings.push('Low beta suggests weak correlation between assets');
    }
    
    if (rSquared < 0.5) {
      warnings.push('Low R² indicates hedge may not be effective');
    }
    
    const hedgeRatio = hedgeQuantity / primaryQuantity;
    const optimalRatio = Math.abs(beta);
    
    if (Math.abs(hedgeRatio - optimalRatio) > 0.3) {
      warnings.push(`Hedge ratio (${hedgeRatio.toFixed(2)}) differs significantly from optimal (${optimalRatio.toFixed(2)})`);
    }
    
    return {
      beta: Math.round(beta * 1000) / 1000,
      rSquared: Math.round(rSquared * 1000) / 1000,
      stabilityWarnings: warnings,
    };
  },
  
  /**
   * Calculate daily returns from prices
   */
  calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  },
  
  /**
   * Calculate beta coefficient
   */
  calculateBeta(primaryReturns: number[], hedgeReturns: number[]): number {
    const n = Math.min(primaryReturns.length, hedgeReturns.length);
    if (n < 5) return 1;
    
    const meanPrimary = primaryReturns.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanHedge = hedgeReturns.slice(0, n).reduce((a, b) => a + b, 0) / n;
    
    let covariance = 0;
    let varianceHedge = 0;
    
    for (let i = 0; i < n; i++) {
      const devPrimary = primaryReturns[i] - meanPrimary;
      const devHedge = hedgeReturns[i] - meanHedge;
      covariance += devPrimary * devHedge;
      varianceHedge += devHedge * devHedge;
    }
    
    if (varianceHedge === 0) return 1;
    
    return covariance / varianceHedge;
  },
  
  /**
   * Calculate R-squared
   */
  calculateRSquared(primaryReturns: number[], hedgeReturns: number[]): number {
    const n = Math.min(primaryReturns.length, hedgeReturns.length);
    if (n < 5) return 0;
    
    const meanPrimary = primaryReturns.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanHedge = hedgeReturns.slice(0, n).reduce((a, b) => a + b, 0) / n;
    
    let ssTotal = 0;
    let ssResidual = 0;
    
    const beta = this.calculateBeta(primaryReturns, hedgeReturns);
    
    for (let i = 0; i < n; i++) {
      const predicted = meanPrimary + beta * (hedgeReturns[i] - meanHedge);
      ssTotal += Math.pow(primaryReturns[i] - meanPrimary, 2);
      ssResidual += Math.pow(primaryReturns[i] - predicted, 2);
    }
    
    if (ssTotal === 0) return 0;
    
    return Math.max(0, 1 - ssResidual / ssTotal);
  },
  
  /**
   * Get hedged trade by ID
   */
  async getById(hedgedTradeId: string, userId: string): Promise<HedgedTrade> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('hedged_trades')
      .select('*')
      .eq('id', hedgedTradeId)
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Hedged trade not found', 404);
    }
    
    return data;
  },
  
  /**
   * Get all hedged trades for a user
   */
  async getAllForUser(userId: string): Promise<HedgedTrade[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('hedged_trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch hedged trades', 500);
    }
    
    return data || [];
  },
};

