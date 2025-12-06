import { unifiedDataLayer as dataLayer } from '../data/unifiedDataLayer.js';
import { PortfolioManager } from './portfolioManager.js';
import { TwelveDataService } from './twelveDataService.js';

/**
 * Portfolio Performance Service
 * Tracks portfolio value over time for paper trading performance visualization
 */
export class PortfolioPerformanceService {
  /**
   * Create a snapshot of portfolio value at current time
   * @param {string} portfolioId - Portfolio ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Snapshot data
   */
  static async createSnapshot(portfolioId, userId) {
    try {
      const portfolio = await dataLayer.getPortfolio(portfolioId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      const positions = await dataLayer.getPortfolioPositions(portfolioId);
      const wallet = await dataLayer.getWallet(userId);
      
      // Fetch real-time prices for all positions
      const positionsWithPrices = await Promise.all(
        positions.map(async (position) => {
          try {
            const quote = await TwelveDataService.getRealTimeQuote(position.ticker);
            return {
              ...position,
              currentPrice: quote.close || quote.price || position.avgCost
            };
          } catch (error) {
            return {
              ...position,
              currentPrice: position.avgCost
            };
          }
        })
      );

      const totalValue = PortfolioManager.calculateTotalValue(positionsWithPrices);
      const unrealizedPnL = PortfolioManager.calculateUnrealizedPnL(positionsWithPrices);
      const cashBalance = wallet ? wallet.availableBalance : 0;
      const totalPortfolioValue = totalValue + cashBalance;

      // Calculate realized P&L from ledger
      const ledger = wallet ? await dataLayer.getLedger(wallet.walletId) : [];
      const realizedPnL = ledger
        .filter(entry => entry.type === 'realized_pnl')
        .reduce((sum, entry) => sum + (entry.amount || 0), 0);

      const snapshot = {
        portfolioId,
        userId,
        timestamp: new Date().toISOString(),
        totalValue,
        cashBalance,
        totalPortfolioValue,
        unrealizedPnL,
        realizedPnL,
        totalPnL: unrealizedPnL + realizedPnL,
        positionCount: positions.length,
        positions: positionsWithPrices.map(p => ({
          ticker: p.ticker,
          shares: p.shares,
          value: p.shares * (p.currentPrice || p.avgCost)
        }))
      };

      // Store snapshot in ledger or separate collection
      await dataLayer.addLedgerEntry({
        walletId: wallet?.walletId || `wallet_${userId}`,
        userId,
        type: 'portfolio_snapshot',
        amount: totalPortfolioValue,
        description: 'Portfolio value snapshot',
        metadata: snapshot
      });

      return snapshot;
    } catch (error) {
      console.error('Error creating portfolio snapshot:', error);
      throw error;
    }
  }

  /**
   * Get portfolio performance history
   * @param {string} portfolioId - Portfolio ID
   * @param {string} userId - User ID
   * @param {number} days - Number of days of history (default: 30)
   * @returns {Promise<Array>} Array of snapshot data
   */
  static async getPerformanceHistory(portfolioId, userId, days = 30) {
    try {
      const wallet = await dataLayer.getWallet(userId);
      if (!wallet) {
        // If no wallet, return empty array instead of error
        return [];
      }

      const ledger = await dataLayer.getLedger(wallet.walletId);
      if (!ledger || !Array.isArray(ledger)) {
        return [];
      }

      const snapshots = ledger
        .filter(entry => 
          entry && 
          entry.type === 'portfolio_snapshot' && 
          entry.metadata?.portfolioId === portfolioId
        )
        .map(entry => ({
          timestamp: entry.timestamp || entry.createdAt || new Date().toISOString(),
          value: entry.metadata?.totalPortfolioValue || entry.amount || 0,
          unrealizedPnL: entry.metadata?.unrealizedPnL || 0,
          realizedPnL: entry.metadata?.realizedPnL || 0,
          totalPnL: entry.metadata?.totalPnL || 0,
          cashBalance: entry.metadata?.cashBalance || 0,
          totalValue: entry.metadata?.totalValue || 0
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Filter by days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return snapshots.filter(s => new Date(s.timestamp) >= cutoffDate);
    } catch (error) {
      console.error('Error getting performance history:', error);
      return [];
    }
  }

  /**
   * Get current portfolio performance metrics
   * @param {string} portfolioId - Portfolio ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Performance metrics
   */
  static async getCurrentPerformance(portfolioId, userId) {
    try {
      const snapshot = await this.createSnapshot(portfolioId, userId);
      const history = await this.getPerformanceHistory(portfolioId, userId, 30);
      
      // Calculate daily change
      const yesterday = history[history.length - 2];
      const dailyChange = yesterday 
        ? snapshot.totalPortfolioValue - yesterday.value
        : 0;
      const dailyChangePercent = yesterday && yesterday.value > 0
        ? (dailyChange / yesterday.value) * 100
        : 0;

      // Calculate overall return
      const initialValue = history.length > 0 ? history[0].value : snapshot.totalPortfolioValue;
      const totalReturn = snapshot.totalPortfolioValue - initialValue;
      const totalReturnPercent = initialValue > 0
        ? (totalReturn / initialValue) * 100
        : 0;

      return {
        ...snapshot,
        dailyChange,
        dailyChangePercent,
        totalReturn,
        totalReturnPercent,
        history
      };
    } catch (error) {
      console.error('Error getting current performance:', error);
      throw error;
    }
  }
}

