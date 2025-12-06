import { isMongoDBAvailable } from '../database/connection.js';
import { User, Wallet, Portfolio, Position, Order, Basket, Ledger } from '../database/models/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * MongoDB Data Layer with offline fallback
 * This layer tries MongoDB first, falls back to file-based storage if unavailable
 */
export const mongoDataLayer = {
  // Users
  createUser: async (userData) => {
    try {
      if (isMongoDBAvailable()) {
        const userId = userData.userId || `user_${Date.now()}`;
        const user = new User({
          userId,
          email: userData.email?.toLowerCase(),
          passwordHash: userData.passwordHash,
          role: userData.role || 'investor',
          riskProfile: userData.riskProfile || 'moderate',
          horizonYears: userData.horizonYears || userData.investmentHorizon || 2,
          mode: userData.mode || (userData.role === 'investor' ? 'investor' : userData.role === 'trader' ? 'trader' : 'auto-trader')
        });
        await user.save();
        return user.toObject();
      }
    } catch (error) {
      console.error('MongoDB createUser error:', error);
      throw error;
    }
  },

  getUser: async (userId) => {
    try {
      if (isMongoDBAvailable()) {
        const user = await User.findOne({ userId });
        return user ? user.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB getUser error:', error);
      throw error;
    }
  },

  getUserByEmail: async (email) => {
    try {
      if (isMongoDBAvailable()) {
        const user = await User.findOne({ email: email.toLowerCase() });
        return user ? user.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB getUserByEmail error:', error);
      throw error;
    }
  },

  updateUser: async (userId, updates) => {
    try {
      if (isMongoDBAvailable()) {
        const user = await User.findOneAndUpdate(
          { userId },
          { $set: updates },
          { new: true }
        );
        return user ? user.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB updateUser error:', error);
      throw error;
    }
  },

  getAllUsers: async () => {
    try {
      if (isMongoDBAvailable()) {
        const users = await User.find({});
        return users.map(u => u.toObject());
      }
    } catch (error) {
      console.error('MongoDB getAllUsers error:', error);
      throw error;
    }
  },

  // Wallets
  createWallet: async (userId, initialBalance = 0) => {
    try {
      if (isMongoDBAvailable()) {
        const walletId = `wallet_${Date.now()}`;
        const wallet = new Wallet({
          walletId,
          userId,
          availableBalance: initialBalance,
          lockedBalance: 0
        });
        await wallet.save();
        return wallet.toObject();
      }
    } catch (error) {
      console.error('MongoDB createWallet error:', error);
      throw error;
    }
  },

  getWallet: async (userId) => {
    try {
      if (isMongoDBAvailable()) {
        const wallet = await Wallet.findOne({ userId });
        return wallet ? wallet.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB getWallet error:', error);
      throw error;
    }
  },

  updateWallet: async (walletId, updates) => {
    try {
      if (isMongoDBAvailable()) {
        const wallet = await Wallet.findOneAndUpdate(
          { walletId },
          { $set: updates },
          { new: true }
        );
        return wallet ? wallet.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB updateWallet error:', error);
      throw error;
    }
  },

  // Portfolios
  createPortfolio: async (portfolioData) => {
    try {
      if (isMongoDBAvailable()) {
        const portfolioId = portfolioData.portfolioId || `portfolio_${Date.now()}`;
        const portfolio = new Portfolio({
          portfolioId,
          userId: portfolioData.userId,
          name: portfolioData.name || 'Default Portfolio'
        });
        await portfolio.save();
        return portfolio.toObject();
      }
    } catch (error) {
      console.error('MongoDB createPortfolio error:', error);
      throw error;
    }
  },

  getPortfolio: async (portfolioId) => {
    try {
      if (isMongoDBAvailable()) {
        const portfolio = await Portfolio.findOne({ portfolioId });
        return portfolio ? portfolio.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB getPortfolio error:', error);
      throw error;
    }
  },

  getUserPortfolios: async (userId) => {
    try {
      if (isMongoDBAvailable()) {
        const portfolios = await Portfolio.find({ userId });
        return portfolios.map(p => p.toObject());
      }
    } catch (error) {
      console.error('MongoDB getUserPortfolios error:', error);
      throw error;
    }
  },

  updatePortfolio: async (portfolioId, updates) => {
    try {
      if (isMongoDBAvailable()) {
        const portfolio = await Portfolio.findOneAndUpdate(
          { portfolioId },
          { $set: updates },
          { new: true }
        );
        return portfolio ? portfolio.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB updatePortfolio error:', error);
      throw error;
    }
  },

  // Positions
  createPosition: async (positionData) => {
    try {
      if (isMongoDBAvailable()) {
        const positionId = positionData.positionId || `position_${Date.now()}`;
        const position = new Position({
          positionId,
          portfolioId: positionData.portfolioId,
          ticker: positionData.ticker.toUpperCase(),
          shares: positionData.shares,
          avgCost: positionData.avgCost,
          currentPrice: positionData.currentPrice || positionData.avgCost,
          lastTradePrice: positionData.lastTradePrice || positionData.avgCost
        });
        await position.save();
        return position.toObject();
      }
    } catch (error) {
      console.error('MongoDB createPosition error:', error);
      throw error;
    }
  },

  getPosition: async (positionId) => {
    try {
      if (isMongoDBAvailable()) {
        const position = await Position.findOne({ positionId });
        return position ? position.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB getPosition error:', error);
      throw error;
    }
  },

  getPortfolioPositions: async (portfolioId) => {
    try {
      if (isMongoDBAvailable()) {
        const positions = await Position.find({ portfolioId });
        return positions.map(p => p.toObject());
      }
    } catch (error) {
      console.error('MongoDB getPortfolioPositions error:', error);
      throw error;
    }
  },

  updatePosition: async (positionId, updates) => {
    try {
      if (isMongoDBAvailable()) {
        const position = await Position.findOneAndUpdate(
          { positionId },
          { $set: updates },
          { new: true }
        );
        return position ? position.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB updatePosition error:', error);
      throw error;
    }
  },

  // Orders
  createOrder: async (orderData) => {
    try {
      if (isMongoDBAvailable()) {
        const orderId = orderData.orderId || `order_${Date.now()}_${uuidv4().substr(0, 9)}`;
        const order = new Order({
          orderId,
          userId: orderData.userId,
          ticker: orderData.ticker.toUpperCase(),
          quantity: orderData.quantity,
          side: orderData.side,
          orderType: orderData.orderType || 'market',
          price: orderData.price,
          totalValue: orderData.totalValue,
          status: orderData.status || 'pending'
        });
        await order.save();
        return order.toObject();
      }
    } catch (error) {
      console.error('MongoDB createOrder error:', error);
      throw error;
    }
  },

  getOrder: async (orderId) => {
    try {
      if (isMongoDBAvailable()) {
        const order = await Order.findOne({ orderId });
        return order ? order.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB getOrder error:', error);
      throw error;
    }
  },

  getUserOrders: async (userId, status = null) => {
    try {
      if (isMongoDBAvailable()) {
        const query = { userId };
        if (status) {
          query.status = status;
        }
        const orders = await Order.find(query).sort({ createdAt: -1 });
        return orders.map(o => o.toObject());
      }
    } catch (error) {
      console.error('MongoDB getUserOrders error:', error);
      throw error;
    }
  },

  updateOrder: async (orderId, updates) => {
    try {
      if (isMongoDBAvailable()) {
        const order = await Order.findOneAndUpdate(
          { orderId },
          { $set: updates },
          { new: true }
        );
        return order ? order.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB updateOrder error:', error);
      throw error;
    }
  },

  // Ledger
  addLedgerEntry: async (entry) => {
    try {
      if (isMongoDBAvailable()) {
        const ledgerId = `ledger_${Date.now()}_${uuidv4().substr(0, 9)}`;
        const ledgerEntry = new Ledger({
          ledgerId,
          userId: entry.userId,
          transactionType: entry.transactionType,
          amount: entry.amount,
          description: entry.description,
          orderId: entry.orderId
        });
        await ledgerEntry.save();
        return ledgerEntry.toObject();
      }
    } catch (error) {
      console.error('MongoDB addLedgerEntry error:', error);
      throw error;
    }
  },

  getLedger: async (userId, limit = 100) => {
    try {
      if (isMongoDBAvailable()) {
        const entries = await Ledger.find({ userId })
          .sort({ createdAt: -1 })
          .limit(limit);
        return entries.map(e => e.toObject());
      }
    } catch (error) {
      console.error('MongoDB getLedger error:', error);
      throw error;
    }
  },

  // Baskets
  createBasket: async (basketData) => {
    try {
      if (isMongoDBAvailable()) {
        const basketId = basketData.basketId || `basket_${Date.now()}`;
        const basket = new Basket({
          basketId,
          symbol: basketData.symbol.toUpperCase(),
          orders: basketData.orders || [],
          status: 'active'
        });
        await basket.save();
        return basket.toObject();
      }
    } catch (error) {
      console.error('MongoDB createBasket error:', error);
      throw error;
    }
  },

  getBasket: async (basketId) => {
    try {
      if (isMongoDBAvailable()) {
        const basket = await Basket.findOne({ basketId });
        return basket ? basket.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB getBasket error:', error);
      throw error;
    }
  },

  getActiveBasketBySymbol: async (symbol) => {
    try {
      if (isMongoDBAvailable()) {
        const basket = await Basket.findOne({
          symbol: symbol.toUpperCase(),
          status: 'active'
        });
        return basket ? basket.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB getActiveBasketBySymbol error:', error);
      throw error;
    }
  },

  updateBasket: async (basketId, updates) => {
    try {
      if (isMongoDBAvailable()) {
        const basket = await Basket.findOneAndUpdate(
          { basketId },
          { $set: updates },
          { new: true }
        );
        return basket ? basket.toObject() : null;
      }
    } catch (error) {
      console.error('MongoDB updateBasket error:', error);
      throw error;
    }
  }
};

