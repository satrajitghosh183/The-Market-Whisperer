import { getSupabaseClient } from '../db/client';
import { AppError, ErrorCodes } from '../utils/errors';
import { Portfolio, CreatePortfolioInput, PositionWithValue } from '../types';
import { positionService } from './positionService';
import { marketDataService } from './marketDataService';

export const portfolioService = {
  /**
   * Module 10.1: Create portfolios with stable identifiers
   */
  async create(userId: string, input: CreatePortfolioInput): Promise<Portfolio> {
    const supabase = getSupabaseClient();
    
    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .insert({
        user_id: userId,
        name: input.name,
        description: input.description || null,
      })
      .select()
      .single();
    
    if (error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        throw new AppError(
          ErrorCodes.DUPLICATE_RESOURCE,
          'A portfolio with this name already exists',
          409
        );
      }
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create portfolio', 500);
    }
    
    return portfolio;
  },
  
  /**
   * Module 10.2: Retrieve portfolio state deterministically
   */
  async getById(portfolioId: string, userId: string): Promise<Portfolio> {
    const supabase = getSupabaseClient();
    
    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch portfolio', 500);
    }
    
    if (!portfolio) {
      throw new AppError(ErrorCodes.PORTFOLIO_NOT_FOUND, 'Portfolio not found', 404);
    }
    
    return portfolio;
  },
  
  /**
   * Get all portfolios for a user
   */
  async getAllForUser(userId: string): Promise<Portfolio[]> {
    const supabase = getSupabaseClient();
    
    const { data: portfolios, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch portfolios', 500);
    }
    
    return portfolios || [];
  },
  
  /**
   * Module 11: Portfolio Valuation + P&L
   * 11.1: Compute market value and unrealized P&L from positions + price data
   * 11.2: Handle empty/zero safely
   */
  async getValuation(portfolioId: string, userId: string): Promise<{
    portfolio: Portfolio;
    positions: PositionWithValue[];
    summary: {
      totalMarketValue: number;
      totalCost: number;
      totalUnrealizedPnl: number;
      totalUnrealizedPnlPercent: number;
    };
  }> {
    const portfolio = await this.getById(portfolioId, userId);
    const positions = await positionService.getAllForPortfolio(portfolioId);
    
    // Handle empty portfolio
    if (positions.length === 0) {
      return {
        portfolio,
        positions: [],
        summary: {
          totalMarketValue: 0,
          totalCost: 0,
          totalUnrealizedPnl: 0,
          totalUnrealizedPnlPercent: 0,
        },
      };
    }
    
    // Get current prices for all tickers
    const tickers = positions.map((p) => p.ticker);
    const prices = await marketDataService.getQuotes(tickers);
    
    // Calculate values for each position
    const positionsWithValue: PositionWithValue[] = positions.map((position) => {
      const shares = parseFloat(position.shares);
      const avgCost = parseFloat(position.avg_cost);
      const currentPrice = prices[position.ticker]?.price || avgCost; // Fallback to avg cost if no price
      
      const marketValue = shares * currentPrice;
      const costBasis = shares * avgCost;
      const unrealizedPnl = marketValue - costBasis;
      const unrealizedPnlPercent = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;
      
      return {
        ...position,
        current_price: currentPrice,
        market_value: marketValue,
        unrealized_pnl: unrealizedPnl,
        unrealized_pnl_percent: unrealizedPnlPercent,
      };
    });
    
    // Calculate summary
    const totalMarketValue = positionsWithValue.reduce((sum, p) => sum + p.market_value, 0);
    const totalCost = positionsWithValue.reduce(
      (sum, p) => sum + parseFloat(p.shares) * parseFloat(p.avg_cost),
      0
    );
    const totalUnrealizedPnl = totalMarketValue - totalCost;
    const totalUnrealizedPnlPercent = totalCost > 0 ? (totalUnrealizedPnl / totalCost) * 100 : 0;
    
    return {
      portfolio,
      positions: positionsWithValue,
      summary: {
        totalMarketValue,
        totalCost,
        totalUnrealizedPnl,
        totalUnrealizedPnlPercent,
      },
    };
  },
  
  /**
   * Verify user owns the portfolio
   */
  async verifyOwnership(portfolioId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    
    const { data } = await supabase
      .from('portfolios')
      .select('id')
      .eq('id', portfolioId)
      .eq('user_id', userId)
      .maybeSingle();
    
    return !!data;
  },
};

