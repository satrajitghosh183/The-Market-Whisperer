import { unifiedDataLayer as dataLayer } from '../data/unifiedDataLayer.js';
import { BasketManager } from './basketManager.js';
import { QuantService } from './quantService.js';
import { loadStockData } from '../data/dataLayer.js';
import { TwelveDataService } from './twelveDataService.js';

export class TradingService {
  static async placeOrder({ userId, ticker, quantity, side, orderType = 'market', price }) {
    // Get wallet
    const wallet = await dataLayer.getWallet(userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    // Get current price - try real-time API first, fallback to file data
    let executionPrice = price;
    if (orderType === 'market') {
      try {
        // Try to get real-time price from Twelve Data API
        const quote = await TwelveDataService.getRealTimeQuote(ticker);
        executionPrice = quote.close || quote.price;
        if (!executionPrice || executionPrice <= 0) {
          throw new Error('Invalid price from API');
        }
      } catch (apiError) {
        console.warn(`Real-time price fetch failed for ${ticker}, using file data:`, apiError.message);
        // Fallback to file-based data
        const data = await loadStockData(ticker);
        if (data.length === 0) {
          throw new Error(`No price data available for ${ticker}. Make sure the ticker exists or API is configured.`);
        }
        executionPrice = data[data.length - 1].close;
        if (!executionPrice || executionPrice <= 0) {
          throw new Error(`Invalid price data for ${ticker}`);
        }
      }
    }
    
    const totalValue = quantity * executionPrice;
    
    // Check buying power for buy orders
    if (side === 'buy') {
      if (wallet.availableBalance < totalValue) {
        throw new Error('Insufficient funds');
      }
      
      // Lock funds
      await dataLayer.updateWallet(wallet.walletId, {
        availableBalance: wallet.availableBalance - totalValue,
        lockedBalance: wallet.lockedBalance + totalValue
      });
    }
    
    // Create order
    const order = await dataLayer.createOrder({
      userId,
      ticker,
      quantity,
      side,
      orderType,
      price: executionPrice,
      totalValue,
      status: 'pending'
    });
    
    // Add to basket
    await BasketManager.addOrderToBasket(order);
    
    return order;
  }
  
  static async executeOrder(orderId) {
    const order = await dataLayer.getOrder(orderId);
    if (!order || order.status !== 'pending') {
      return null;
    }
    
    // Get user's portfolio
    const portfolios = await dataLayer.getUserPortfolios(order.userId);
    if (portfolios.length === 0) {
      throw new Error('Portfolio not found');
    }
    const portfolio = portfolios[0];
    
    // Get or create position
    const positions = await dataLayer.getPortfolioPositions(portfolio.portfolioId);
    let position = positions.find(p => p.ticker === order.ticker);
    
    const wallet = await dataLayer.getWallet(order.userId);
    
    if (order.side === 'buy') {
      if (position) {
        // Update existing position
        const newShares = position.shares + order.quantity;
        const newAvgCost = ((position.shares * position.avgCost) + (order.quantity * order.price)) / newShares;
        
        await dataLayer.updatePosition(position.positionId, {
          shares: newShares,
          avgCost: newAvgCost,
          lastTradePrice: order.price
        });
      } else {
        // Create new position
        position = await dataLayer.createPosition({
          portfolioId: portfolio.portfolioId,
          ticker: order.ticker,
          shares: order.quantity,
          avgCost: order.price,
          currentPrice: order.price,
          lastTradePrice: order.price
        });
      }
      
      // Update wallet
      await dataLayer.updateWallet(wallet.walletId, {
        lockedBalance: wallet.lockedBalance - order.totalValue
      });
    } else {
      // Sell order
      if (!position || position.shares < order.quantity) {
        throw new Error('Insufficient shares');
      }
      
      const newShares = position.shares - order.quantity;
      const realizedPnL = order.quantity * (order.price - position.avgCost);
      
      if (newShares === 0) {
        // Close position - in real system, mark as closed instead of delete
        await dataLayer.updatePosition(position.positionId, {
          shares: 0,
          realizedPnL: (position.realizedPnL || 0) + realizedPnL
        });
      } else {
        await dataLayer.updatePosition(position.positionId, {
          shares: newShares,
          realizedPnL: (position.realizedPnL || 0) + realizedPnL
        });
      }
      
      // Update wallet
      await dataLayer.updateWallet(wallet.walletId, {
        availableBalance: wallet.availableBalance + order.totalValue,
        lockedBalance: wallet.lockedBalance - order.totalValue
      });
    }
    
    // Update order status
    await dataLayer.updateOrder(orderId, {
      status: 'executed',
      executedAt: new Date().toISOString()
    });
    
    // Add ledger entry
    await dataLayer.addLedgerEntry({
      userId: order.userId,
      transactionType: 'trade',
      amount: order.side === 'buy' ? -order.totalValue : order.totalValue,
      description: `${order.side.toUpperCase()} ${order.quantity} ${order.ticker} @ ${order.price}`,
      orderId
    });
    
    return { order, position };
  }
  
  static async placeCoupledTrade({ userId, longTicker, shortTicker, longQuantity, shortQuantity }) {
    // Calculate hedge ratio (simplified - would use SPY regression in production)
    const hedgeRatio = 1.0; // Simplified
    
    // Place long order
    const longOrder = await this.placeOrder({
      userId,
      ticker: longTicker,
      quantity: longQuantity,
      side: 'buy',
      orderType: 'market'
    });
    
    // Place short order
    const shortOrder = await this.placeOrder({
      userId,
      ticker: shortTicker,
      quantity: shortQuantity,
      side: 'sell',
      orderType: 'market'
    });
    
    // Execute both orders
    await this.executeOrder(longOrder.orderId);
    await this.executeOrder(shortOrder.orderId);
    
    return {
      coupledTradeId: `coupled_${Date.now()}`,
      longOrder,
      shortOrder,
      hedgeRatio,
      expectedBeta: 0 // Market neutral
    };
  }
}

