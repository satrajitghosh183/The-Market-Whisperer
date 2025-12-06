import { mongoDataLayer } from './mongoDataLayer.js';
import { dataLayer as fileDataLayer } from './dataLayer.js';
import { isMongoDBAvailable, getMongoDBStatus } from '../database/connection.js';

/**
 * Unified Data Layer with automatic fallback
 * Tries MongoDB first, falls back to file-based storage if MongoDB is unavailable
 */
export const unifiedDataLayer = {
  // Users
  createUser: async (userData) => {
    try {
      if (isMongoDBAvailable()) {
        return await mongoDataLayer.createUser(userData);
      }
    } catch (error) {
      console.warn('MongoDB createUser failed, using file storage:', error.message);
    }
    return await fileDataLayer.createUser(userData);
  },

  getUser: async (userId) => {
    try {
      if (isMongoDBAvailable()) {
        const user = await mongoDataLayer.getUser(userId);
        if (user) return user;
      }
    } catch (error) {
      console.warn('MongoDB getUser failed, using file storage:', error.message);
    }
    return await fileDataLayer.getUser(userId);
  },

  getUserByEmail: async (email) => {
    try {
      if (isMongoDBAvailable()) {
        const user = await mongoDataLayer.getUserByEmail(email);
        if (user) return user;
      }
    } catch (error) {
      console.warn('MongoDB getUserByEmail failed, using file storage:', error.message);
    }
    return await fileDataLayer.getUserByEmail(email);
  },

  updateUser: async (userId, updates) => {
    try {
      if (isMongoDBAvailable()) {
        const user = await mongoDataLayer.updateUser(userId, updates);
        if (user) return user;
      }
    } catch (error) {
      console.warn('MongoDB updateUser failed, using file storage:', error.message);
    }
    return await fileDataLayer.updateUser(userId, updates);
  },

  getAllUsers: async () => {
    try {
      if (isMongoDBAvailable()) {
        const users = await mongoDataLayer.getAllUsers();
        if (users) return users;
      }
    } catch (error) {
      console.warn('MongoDB getAllUsers failed, using file storage:', error.message);
    }
    return await fileDataLayer.getAllUsers();
  },

  // Wallets
  createWallet: async (userId, initialBalance = 0) => {
    try {
      if (isMongoDBAvailable()) {
        return await mongoDataLayer.createWallet(userId, initialBalance);
      }
    } catch (error) {
      console.warn('MongoDB createWallet failed, using file storage:', error.message);
    }
    return await fileDataLayer.createWallet(userId, initialBalance);
  },

  getWallet: async (userId) => {
    try {
      if (isMongoDBAvailable()) {
        const wallet = await mongoDataLayer.getWallet(userId);
        if (wallet) return wallet;
      }
    } catch (error) {
      console.warn('MongoDB getWallet failed, using file storage:', error.message);
    }
    return await fileDataLayer.getWallet(userId);
  },

  updateWallet: async (walletId, updates) => {
    try {
      if (isMongoDBAvailable()) {
        const wallet = await mongoDataLayer.updateWallet(walletId, updates);
        if (wallet) return wallet;
      }
    } catch (error) {
      console.warn('MongoDB updateWallet failed, using file storage:', error.message);
    }
    return await fileDataLayer.updateWallet(walletId, updates);
  },

  // Portfolios
  createPortfolio: async (portfolioData) => {
    try {
      if (isMongoDBAvailable()) {
        return await mongoDataLayer.createPortfolio(portfolioData);
      }
    } catch (error) {
      console.warn('MongoDB createPortfolio failed, using file storage:', error.message);
    }
    return await fileDataLayer.createPortfolio(portfolioData);
  },

  getPortfolio: async (portfolioId) => {
    try {
      if (isMongoDBAvailable()) {
        const portfolio = await mongoDataLayer.getPortfolio(portfolioId);
        if (portfolio) return portfolio;
      }
    } catch (error) {
      console.warn('MongoDB getPortfolio failed, using file storage:', error.message);
    }
    return await fileDataLayer.getPortfolio(portfolioId);
  },

  getUserPortfolios: async (userId) => {
    try {
      if (isMongoDBAvailable()) {
        return await mongoDataLayer.getUserPortfolios(userId);
      }
    } catch (error) {
      console.warn('MongoDB getUserPortfolios failed, using file storage:', error.message);
    }
    return await fileDataLayer.getUserPortfolios(userId);
  },

  updatePortfolio: async (portfolioId, updates) => {
    try {
      if (isMongoDBAvailable()) {
        const portfolio = await mongoDataLayer.updatePortfolio(portfolioId, updates);
        if (portfolio) return portfolio;
      }
    } catch (error) {
      console.warn('MongoDB updatePortfolio failed, using file storage:', error.message);
    }
    return await fileDataLayer.updatePortfolio(portfolioId, updates);
  },

  // Positions
  createPosition: async (positionData) => {
    try {
      if (isMongoDBAvailable()) {
        return await mongoDataLayer.createPosition(positionData);
      }
    } catch (error) {
      console.warn('MongoDB createPosition failed, using file storage:', error.message);
    }
    return await fileDataLayer.createPosition(positionData);
  },

  getPosition: async (positionId) => {
    try {
      if (isMongoDBAvailable()) {
        const position = await mongoDataLayer.getPosition(positionId);
        if (position) return position;
      }
    } catch (error) {
      console.warn('MongoDB getPosition failed, using file storage:', error.message);
    }
    return await fileDataLayer.getPosition(positionId);
  },

  getPortfolioPositions: async (portfolioId) => {
    try {
      if (isMongoDBAvailable()) {
        return await mongoDataLayer.getPortfolioPositions(portfolioId);
      }
    } catch (error) {
      console.warn('MongoDB getPortfolioPositions failed, using file storage:', error.message);
    }
    return await fileDataLayer.getPortfolioPositions(portfolioId);
  },

  updatePosition: async (positionId, updates) => {
    try {
      if (isMongoDBAvailable()) {
        const position = await mongoDataLayer.updatePosition(positionId, updates);
        if (position) return position;
      }
    } catch (error) {
      console.warn('MongoDB updatePosition failed, using file storage:', error.message);
    }
    return await fileDataLayer.updatePosition(positionId, updates);
  },

  // Orders
  createOrder: async (orderData) => {
    try {
      if (isMongoDBAvailable()) {
        return await mongoDataLayer.createOrder(orderData);
      }
    } catch (error) {
      console.warn('MongoDB createOrder failed, using file storage:', error.message);
    }
    return await fileDataLayer.createOrder(orderData);
  },

  getOrder: async (orderId) => {
    try {
      if (isMongoDBAvailable()) {
        const order = await mongoDataLayer.getOrder(orderId);
        if (order) return order;
      }
    } catch (error) {
      console.warn('MongoDB getOrder failed, using file storage:', error.message);
    }
    return await fileDataLayer.getOrder(orderId);
  },

  getUserOrders: async (userId, status = null) => {
    try {
      if (isMongoDBAvailable()) {
        return await mongoDataLayer.getUserOrders(userId, status);
      }
    } catch (error) {
      console.warn('MongoDB getUserOrders failed, using file storage:', error.message);
    }
    const orders = await fileDataLayer.getUserOrders(userId);
    if (status) {
      return orders.filter(o => o.status === status);
    }
    return orders;
  },

  updateOrder: async (orderId, updates) => {
    try {
      if (isMongoDBAvailable()) {
        const order = await mongoDataLayer.updateOrder(orderId, updates);
        if (order) return order;
      }
    } catch (error) {
      console.warn('MongoDB updateOrder failed, using file storage:', error.message);
    }
    return await fileDataLayer.updateOrder(orderId, updates);
  },

  // Ledger
  addLedgerEntry: async (entry) => {
    try {
      if (isMongoDBAvailable()) {
        return await mongoDataLayer.addLedgerEntry(entry);
      }
    } catch (error) {
      console.warn('MongoDB addLedgerEntry failed, using file storage:', error.message);
    }
    return await fileDataLayer.addLedgerEntry(entry);
  },

  getLedger: async (userId) => {
    try {
      if (isMongoDBAvailable()) {
        return await mongoDataLayer.getLedger(userId);
      }
    } catch (error) {
      console.warn('MongoDB getLedger failed, using file storage:', error.message);
    }
    const wallet = await fileDataLayer.getWallet(userId);
    if (wallet) {
      return await fileDataLayer.getLedger(wallet.walletId);
    }
    return [];
  },

  // Baskets
  createBasket: async (basketData) => {
    try {
      if (isMongoDBAvailable()) {
        return await mongoDataLayer.createBasket(basketData);
      }
    } catch (error) {
      console.warn('MongoDB createBasket failed, using file storage:', error.message);
    }
    return await fileDataLayer.createBasket(basketData);
  },

  getBasket: async (basketId) => {
    try {
      if (isMongoDBAvailable()) {
        const basket = await mongoDataLayer.getBasket(basketId);
        if (basket) return basket;
      }
    } catch (error) {
      console.warn('MongoDB getBasket failed, using file storage:', error.message);
    }
    return await fileDataLayer.getBasket(basketId);
  },

  getActiveBasketBySymbol: async (symbol) => {
    try {
      if (isMongoDBAvailable()) {
        return await mongoDataLayer.getActiveBasketBySymbol(symbol);
      }
    } catch (error) {
      console.warn('MongoDB getActiveBasketBySymbol failed, using file storage:', error.message);
    }
    // File-based fallback - this is handled by BasketManager in memory
    return null;
  },

  updateBasket: async (basketId, updates) => {
    try {
      if (isMongoDBAvailable()) {
        const basket = await mongoDataLayer.updateBasket(basketId, updates);
        if (basket) return basket;
      }
    } catch (error) {
      console.warn('MongoDB updateBasket failed, using file storage:', error.message);
    }
    return await fileDataLayer.updateBasket(basketId, updates);
  },

  // Get database status
  getDatabaseStatus: () => {
    return getMongoDBStatus();
  }
};

/**
 * Initialize the unified data layer
 * Connects to MongoDB if available, otherwise uses file-based storage
 */
export async function initializeDataLayer() {
  const { connectMongoDB } = await import('../database/connection.js');
  const { initializeDataLayer: initFileLayer } = await import('./dataLayer.js');
  
  // Initialize file-based data layer first (always available)
  await initFileLayer();
  
  // Try to connect to MongoDB
  try {
    await connectMongoDB();
    console.log('✅ Data layer initialized');
  } catch (error) {
    console.warn('⚠️  MongoDB connection failed, using file-based storage as fallback');
    console.warn('   This is fine for development, but MongoDB is recommended for production');
  }
}

