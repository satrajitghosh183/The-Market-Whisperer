import { getSupabaseClient } from '../db/client';
import { AppError, ErrorCodes } from '../utils/errors';
import { Report, CreateReportInput } from '../types';
import { portfolioService } from './portfolioService';
import { orderService } from './orderService';
import { ledgerService } from './ledgerService';

export const reportService = {
  /**
   * Module 12: Reports Generation
   * 12.1: Generate portfolio reports for a selected interval
   * 12.2: Persist artifacts with reproducible inputs + timestamps
   */
  async generate(userId: string, input: CreateReportInput): Promise<Report> {
    const supabase = getSupabaseClient();
    
    // Verify portfolio ownership if provided
    if (input.portfolio_id) {
      const ownsPortfolio = await portfolioService.verifyOwnership(input.portfolio_id, userId);
      if (!ownsPortfolio) {
        throw new AppError(ErrorCodes.FORBIDDEN, 'You do not own this portfolio', 403);
      }
    }
    
    // Store input params for reproducibility
    const inputParams = {
      portfolio_id: input.portfolio_id,
      start_date: input.start_date,
      end_date: input.end_date,
      generated_by: userId,
      generated_at_utc: new Date().toISOString(),
    };
    
    // Generate report data based on type
    let outputData: Record<string, unknown>;
    
    switch (input.report_type) {
      case 'PORTFOLIO_SUMMARY':
        outputData = await this.generatePortfolioSummary(userId, input);
        break;
      case 'POSITIONS_DETAIL':
        outputData = await this.generatePositionsDetail(userId, input);
        break;
      case 'TRANSACTION_HISTORY':
        outputData = await this.generateTransactionHistory(userId, input);
        break;
      case 'PNL_REPORT':
        outputData = await this.generatePnlReport(userId, input);
        break;
      default:
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid report type', 400);
    }
    
    // Persist report
    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        user_id: userId,
        portfolio_id: input.portfolio_id || null,
        report_type: input.report_type,
        start_date: input.start_date,
        end_date: input.end_date,
        input_params: inputParams,
        output_data: outputData,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to save report', 500);
    }
    
    return report;
  },
  
  /**
   * Generate portfolio summary report
   */
  async generatePortfolioSummary(
    userId: string,
    input: CreateReportInput
  ): Promise<Record<string, unknown>> {
    if (!input.portfolio_id) {
      // Get all portfolios summary
      const portfolios = await portfolioService.getAllForUser(userId);
      const summaries = await Promise.all(
        portfolios.map(async (p) => {
          const valuation = await portfolioService.getValuation(p.id, userId);
          return {
            portfolio_id: p.id,
            portfolio_name: p.name,
            ...valuation.summary,
          };
        })
      );
      
      return {
        report_type: 'PORTFOLIO_SUMMARY',
        portfolios: summaries,
        total_portfolios: portfolios.length,
      };
    }
    
    const valuation = await portfolioService.getValuation(input.portfolio_id, userId);
    
    return {
      report_type: 'PORTFOLIO_SUMMARY',
      portfolio: valuation.portfolio,
      positions_count: valuation.positions.length,
      summary: valuation.summary,
    };
  },
  
  /**
   * Generate positions detail report
   */
  async generatePositionsDetail(
    userId: string,
    input: CreateReportInput
  ): Promise<Record<string, unknown>> {
    if (!input.portfolio_id) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'portfolio_id is required for POSITIONS_DETAIL report',
        400
      );
    }
    
    const valuation = await portfolioService.getValuation(input.portfolio_id, userId);
    
    return {
      report_type: 'POSITIONS_DETAIL',
      portfolio: valuation.portfolio,
      positions: valuation.positions,
      summary: valuation.summary,
    };
  },
  
  /**
   * Generate transaction history report
   */
  async generateTransactionHistory(
    userId: string,
    input: CreateReportInput
  ): Promise<Record<string, unknown>> {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('ledger_transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', `${input.start_date}T00:00:00Z`)
      .lte('created_at', `${input.end_date}T23:59:59Z`)
      .order('created_at', { ascending: false });
    
    const { data: transactions, error } = await query;
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch transactions', 500);
    }
    
    // Get entries for each transaction
    const transactionsWithEntries = await Promise.all(
      (transactions || []).map(async (tx) => {
        const entries = await ledgerService.getEntriesForTransaction(tx.id);
        return { ...tx, entries };
      })
    );
    
    return {
      report_type: 'TRANSACTION_HISTORY',
      start_date: input.start_date,
      end_date: input.end_date,
      transactions: transactionsWithEntries,
      total_transactions: transactionsWithEntries.length,
    };
  },
  
  /**
   * Generate P&L report
   */
  async generatePnlReport(
    userId: string,
    input: CreateReportInput
  ): Promise<Record<string, unknown>> {
    const supabase = getSupabaseClient();
    
    // Get all sell orders in the date range
    let query = supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .eq('side', 'SELL')
      .eq('status', 'FILLED')
      .gte('filled_at', `${input.start_date}T00:00:00Z`)
      .lte('filled_at', `${input.end_date}T23:59:59Z`);
    
    if (input.portfolio_id) {
      query = query.eq('portfolio_id', input.portfolio_id);
    }
    
    const { data: sellOrders } = await query;
    
    // Get unrealized P&L from current positions
    let unrealizedPnl = 0;
    if (input.portfolio_id) {
      const valuation = await portfolioService.getValuation(input.portfolio_id, userId);
      unrealizedPnl = valuation.summary.totalUnrealizedPnl;
    }
    
    return {
      report_type: 'PNL_REPORT',
      start_date: input.start_date,
      end_date: input.end_date,
      realized_trades: sellOrders || [],
      realized_trade_count: sellOrders?.length || 0,
      unrealized_pnl: unrealizedPnl,
    };
  },
  
  /**
   * Get report by ID
   */
  async getById(reportId: string, userId: string): Promise<Report> {
    const supabase = getSupabaseClient();
    
    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single();
    
    if (error || !report) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Report not found', 404);
    }
    
    return report;
  },
  
  /**
   * Get all reports for a user
   */
  async getAllForUser(userId: string): Promise<Report[]> {
    const supabase = getSupabaseClient();
    
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false });
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch reports', 500);
    }
    
    return reports || [];
  },
};

