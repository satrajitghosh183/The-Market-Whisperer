import { getSupabaseClient } from '../db/client';
import { AppError, ErrorCodes } from '../utils/errors';
import { Position } from '../types';

export const positionService = {
  /**
   * Get position for a specific ticker in a portfolio
   */
  async getByTicker(portfolioId: string, ticker: string): Promise<Position | null> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('ticker', ticker)
      .maybeSingle();
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch position', 500);
    }
    
    return data;
  },
  
  /**
   * Get all positions for a portfolio
   */
  async getAllForPortfolio(portfolioId: string): Promise<Position[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('ticker', { ascending: true });
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch positions', 500);
    }
    
    return data || [];
  },
  
  /**
   * Module 9: VWAP Position Update on Buy
   * 9.1: Maintain nonnegative shares
   * 9.2: Update avg_cost via VWAP on buys
   */
  async updateOnBuy(
    portfolioId: string,
    ticker: string,
    quantity: number,
    price: number
  ): Promise<Position> {
    const supabase = getSupabaseClient();
    
    // Get existing position
    const existingPosition = await this.getByTicker(portfolioId, ticker);
    
    if (existingPosition) {
      // Calculate VWAP for new avg_cost
      const existingShares = parseFloat(existingPosition.shares);
      const existingAvgCost = parseFloat(existingPosition.avg_cost);
      
      const totalShares = existingShares + quantity;
      const totalCost = existingShares * existingAvgCost + quantity * price;
      const newAvgCost = totalCost / totalShares;
      
      const { data, error } = await supabase
        .from('positions')
        .update({
          shares: totalShares,
          avg_cost: newAvgCost,
        })
        .eq('id', existingPosition.id)
        .select()
        .single();
      
      if (error) {
        throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update position', 500);
      }
      
      return data;
    } else {
      // Create new position
      const { data, error } = await supabase
        .from('positions')
        .insert({
          portfolio_id: portfolioId,
          ticker,
          shares: quantity,
          avg_cost: price,
        })
        .select()
        .single();
      
      if (error) {
        throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create position', 500);
      }
      
      return data;
    }
  },
  
  /**
   * Module 9.3: Position Update on Sell
   * - Preserve avg_cost on sells (don't mutate)
   * - Reduce shares only
   */
  async updateOnSell(
    portfolioId: string,
    ticker: string,
    quantity: number
  ): Promise<{ position: Position; realizedPnl: number; costBasis: number }> {
    const supabase = getSupabaseClient();
    
    const existingPosition = await this.getByTicker(portfolioId, ticker);
    
    if (!existingPosition) {
      throw new AppError(ErrorCodes.POSITION_NOT_FOUND, 'No position found for this ticker', 404);
    }
    
    const existingShares = parseFloat(existingPosition.shares);
    const avgCost = parseFloat(existingPosition.avg_cost);
    
    if (existingShares < quantity) {
      throw new AppError(
        ErrorCodes.INSUFFICIENT_SHARES,
        `Insufficient shares. Have ${existingShares}, trying to sell ${quantity}`,
        422
      );
    }
    
    const newShares = existingShares - quantity;
    const costBasis = quantity * avgCost;
    
    // Update position - avg_cost stays the same!
    const { data, error } = await supabase
      .from('positions')
      .update({
        shares: newShares,
        // avg_cost is NOT updated on sell
      })
      .eq('id', existingPosition.id)
      .select()
      .single();
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update position', 500);
    }
    
    return {
      position: data,
      realizedPnl: 0, // P&L is calculated in order service using sale price
      costBasis,
    };
  },
  
  /**
   * Check if there are sufficient shares to sell
   */
  async hasSufficientShares(portfolioId: string, ticker: string, quantity: number): Promise<boolean> {
    const position = await this.getByTicker(portfolioId, ticker);
    
    if (!position) {
      return false;
    }
    
    return parseFloat(position.shares) >= quantity;
  },
};

