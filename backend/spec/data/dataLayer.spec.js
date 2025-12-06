import { dataLayer, initializeDataLayer, loadStockData, getAvailableTickers } from '../../src/data/dataLayer.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupTestStorage, cleanupTestStorage, createMockStockData } from '../helpers/testHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('DataLayer', () => {
  beforeEach(async () => {
    await initializeDataLayer();
  });

  describe('User Operations', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        role: 'investor'
      };

      const user = await dataLayer.createUser(userData);

      expect(user).toBeDefined();
      expect(user.userId).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.createdAt).toBeDefined();
    });

    it('should get a user by userId', async () => {
      const userData = {
        email: 'test2@example.com',
        passwordHash: 'hashed_password',
        role: 'trader'
      };

      const createdUser = await dataLayer.createUser(userData);
      const retrievedUser = await dataLayer.getUser(createdUser.userId);

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser.userId).toBe(createdUser.userId);
      expect(retrievedUser.email).toBe(userData.email);
    });

    it('should return null for non-existent user', async () => {
      const user = await dataLayer.getUser('non_existent_user');
      expect(user).toBeNull();
    });

    it('should get a user by email', async () => {
      const userData = {
        email: 'test3@example.com',
        passwordHash: 'hashed_password',
        role: 'investor'
      };

      await dataLayer.createUser(userData);
      const retrievedUser = await dataLayer.getUserByEmail(userData.email);

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser.email).toBe(userData.email);
    });

    it('should return null for non-existent email', async () => {
      const user = await dataLayer.getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('Wallet Operations', () => {
    it('should create a wallet for a user', async () => {
      const user = await dataLayer.createUser({
        email: 'wallet@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const wallet = await dataLayer.createWallet(user.userId, 5000);

      expect(wallet).toBeDefined();
      expect(wallet.walletId).toBeDefined();
      expect(wallet.userId).toBe(user.userId);
      expect(wallet.availableBalance).toBe(5000);
      expect(wallet.lockedBalance).toBe(0);
      expect(wallet.createdAt).toBeDefined();
    });

    it('should create a wallet with default balance of 0', async () => {
      const user = await dataLayer.createUser({
        email: 'wallet2@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const wallet = await dataLayer.createWallet(user.userId);

      expect(wallet.availableBalance).toBe(0);
    });

    it('should get a wallet by userId', async () => {
      const user = await dataLayer.createUser({
        email: 'wallet3@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const createdWallet = await dataLayer.createWallet(user.userId, 10000);
      const retrievedWallet = await dataLayer.getWallet(user.userId);

      expect(retrievedWallet).toBeDefined();
      expect(retrievedWallet.walletId).toBe(createdWallet.walletId);
      expect(retrievedWallet.userId).toBe(user.userId);
    });

    it('should return null for non-existent wallet', async () => {
      const wallet = await dataLayer.getWallet('non_existent_user');
      expect(wallet).toBeNull();
    });

    it('should update wallet balance', async () => {
      const user = await dataLayer.createUser({
        email: 'wallet4@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const wallet = await dataLayer.createWallet(user.userId, 10000);
      const updatedWallet = await dataLayer.updateWallet(wallet.walletId, {
        availableBalance: 5000,
        lockedBalance: 5000
      });

      expect(updatedWallet.availableBalance).toBe(5000);
      expect(updatedWallet.lockedBalance).toBe(5000);
    });

    it('should return null when updating non-existent wallet', async () => {
      const result = await dataLayer.updateWallet('non_existent_wallet', {
        availableBalance: 1000
      });
      expect(result).toBeNull();
    });
  });

  describe('Portfolio Operations', () => {
    it('should create a portfolio', async () => {
      const user = await dataLayer.createUser({
        email: 'portfolio@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const portfolioData = {
        userId: user.userId,
        benchmark: 'SPY',
        strategyId: 'default',
        holdings: ['AAPL', 'GOOGL'],
        targetWeights: { AAPL: 0.5, GOOGL: 0.5 }
      };

      const portfolio = await dataLayer.createPortfolio(portfolioData);

      expect(portfolio).toBeDefined();
      expect(portfolio.portfolioId).toBeDefined();
      expect(portfolio.userId).toBe(user.userId);
      expect(portfolio.benchmark).toBe('SPY');
      expect(portfolio.holdings).toEqual(['AAPL', 'GOOGL']);
      expect(portfolio.createdAt).toBeDefined();
    });

    it('should get a portfolio by portfolioId', async () => {
      const user = await dataLayer.createUser({
        email: 'portfolio2@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const createdPortfolio = await dataLayer.createPortfolio({
        userId: user.userId,
        benchmark: 'SPY',
        strategyId: 'default',
        holdings: [],
        targetWeights: {}
      });

      const retrievedPortfolio = await dataLayer.getPortfolio(createdPortfolio.portfolioId);

      expect(retrievedPortfolio).toBeDefined();
      expect(retrievedPortfolio.portfolioId).toBe(createdPortfolio.portfolioId);
    });

    it('should return null for non-existent portfolio', async () => {
      const portfolio = await dataLayer.getPortfolio('non_existent_portfolio');
      expect(portfolio).toBeNull();
    });

    it('should get all portfolios for a user', async () => {
      const user = await dataLayer.createUser({
        email: 'portfolio3@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      await dataLayer.createPortfolio({
        userId: user.userId,
        benchmark: 'SPY',
        strategyId: 'default',
        holdings: [],
        targetWeights: {}
      });

      await dataLayer.createPortfolio({
        userId: user.userId,
        benchmark: 'QQQ',
        strategyId: 'aggressive',
        holdings: [],
        targetWeights: {}
      });

      const portfolios = await dataLayer.getUserPortfolios(user.userId);

      expect(portfolios.length).toBe(2);
      expect(portfolios.every(p => p.userId === user.userId)).toBe(true);
    });

    it('should update a portfolio', async () => {
      const user = await dataLayer.createUser({
        email: 'portfolio4@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const portfolio = await dataLayer.createPortfolio({
        userId: user.userId,
        benchmark: 'SPY',
        strategyId: 'default',
        holdings: [],
        targetWeights: {}
      });

      const updatedPortfolio = await dataLayer.updatePortfolio(portfolio.portfolioId, {
        benchmark: 'QQQ',
        holdings: ['AAPL']
      });

      expect(updatedPortfolio.benchmark).toBe('QQQ');
      expect(updatedPortfolio.holdings).toEqual(['AAPL']);
    });

    it('should return null when updating non-existent portfolio', async () => {
      const result = await dataLayer.updatePortfolio('non_existent_portfolio', {
        benchmark: 'QQQ'
      });
      expect(result).toBeNull();
    });
  });

  describe('Position Operations', () => {
    it('should create a position', async () => {
      const user = await dataLayer.createUser({
        email: 'position@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const portfolio = await dataLayer.createPortfolio({
        userId: user.userId,
        benchmark: 'SPY',
        strategyId: 'default',
        holdings: [],
        targetWeights: {}
      });

      const positionData = {
        portfolioId: portfolio.portfolioId,
        ticker: 'AAPL',
        shares: 10,
        avgCost: 150.00,
        currentPrice: 155.00
      };

      const position = await dataLayer.createPosition(positionData);

      expect(position).toBeDefined();
      expect(position.positionId).toBeDefined();
      expect(position.portfolioId).toBe(portfolio.portfolioId);
      expect(position.ticker).toBe('AAPL');
      expect(position.shares).toBe(10);
      expect(position.createdAt).toBeDefined();
    });

    it('should get a position by positionId', async () => {
      const user = await dataLayer.createUser({
        email: 'position2@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const portfolio = await dataLayer.createPortfolio({
        userId: user.userId,
        benchmark: 'SPY',
        strategyId: 'default',
        holdings: [],
        targetWeights: {}
      });

      const createdPosition = await dataLayer.createPosition({
        portfolioId: portfolio.portfolioId,
        ticker: 'GOOGL',
        shares: 5,
        avgCost: 2000.00,
        currentPrice: 2100.00
      });

      const retrievedPosition = await dataLayer.getPosition(createdPosition.positionId);

      expect(retrievedPosition).toBeDefined();
      expect(retrievedPosition.positionId).toBe(createdPosition.positionId);
      expect(retrievedPosition.ticker).toBe('GOOGL');
    });

    it('should return null for non-existent position', async () => {
      const position = await dataLayer.getPosition('non_existent_position');
      expect(position).toBeNull();
    });

    it('should get all positions for a portfolio', async () => {
      const user = await dataLayer.createUser({
        email: 'position3@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const portfolio = await dataLayer.createPortfolio({
        userId: user.userId,
        benchmark: 'SPY',
        strategyId: 'default',
        holdings: [],
        targetWeights: {}
      });

      await dataLayer.createPosition({
        portfolioId: portfolio.portfolioId,
        ticker: 'AAPL',
        shares: 10,
        avgCost: 150.00,
        currentPrice: 155.00
      });

      await dataLayer.createPosition({
        portfolioId: portfolio.portfolioId,
        ticker: 'MSFT',
        shares: 5,
        avgCost: 300.00,
        currentPrice: 310.00
      });

      const positions = await dataLayer.getPortfolioPositions(portfolio.portfolioId);

      expect(positions.length).toBe(2);
      expect(positions.every(p => p.portfolioId === portfolio.portfolioId)).toBe(true);
    });

    it('should update a position', async () => {
      const user = await dataLayer.createUser({
        email: 'position4@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const portfolio = await dataLayer.createPortfolio({
        userId: user.userId,
        benchmark: 'SPY',
        strategyId: 'default',
        holdings: [],
        targetWeights: {}
      });

      const position = await dataLayer.createPosition({
        portfolioId: portfolio.portfolioId,
        ticker: 'AAPL',
        shares: 10,
        avgCost: 150.00,
        currentPrice: 155.00
      });

      const updatedPosition = await dataLayer.updatePosition(position.positionId, {
        shares: 15,
        currentPrice: 160.00
      });

      expect(updatedPosition.shares).toBe(15);
      expect(updatedPosition.currentPrice).toBe(160.00);
    });

    it('should return null when updating non-existent position', async () => {
      const result = await dataLayer.updatePosition('non_existent_position', {
        shares: 20
      });
      expect(result).toBeNull();
    });
  });

  describe('Order Operations', () => {
    it('should create an order', async () => {
      const user = await dataLayer.createUser({
        email: 'order@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const orderData = {
        userId: user.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market',
        price: 150.00,
        totalValue: 1500.00
      };

      const order = await dataLayer.createOrder(orderData);

      expect(order).toBeDefined();
      expect(order.orderId).toBeDefined();
      expect(order.userId).toBe(user.userId);
      expect(order.ticker).toBe('AAPL');
      expect(order.quantity).toBe(10);
      expect(order.side).toBe('buy');
      expect(order.status).toBe('pending');
      expect(order.createdAt).toBeDefined();
    });

    it('should get an order by orderId', async () => {
      const user = await dataLayer.createUser({
        email: 'order2@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const createdOrder = await dataLayer.createOrder({
        userId: user.userId,
        ticker: 'GOOGL',
        quantity: 5,
        side: 'sell',
        orderType: 'limit',
        price: 2000.00,
        totalValue: 10000.00
      });

      const retrievedOrder = await dataLayer.getOrder(createdOrder.orderId);

      expect(retrievedOrder).toBeDefined();
      expect(retrievedOrder.orderId).toBe(createdOrder.orderId);
      expect(retrievedOrder.ticker).toBe('GOOGL');
    });

    it('should return null for non-existent order', async () => {
      const order = await dataLayer.getOrder('non_existent_order');
      expect(order).toBeNull();
    });

    it('should get all orders for a user', async () => {
      const user = await dataLayer.createUser({
        email: 'order3@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      await dataLayer.createOrder({
        userId: user.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market',
        price: 150.00,
        totalValue: 1500.00
      });

      await dataLayer.createOrder({
        userId: user.userId,
        ticker: 'MSFT',
        quantity: 5,
        side: 'sell',
        orderType: 'limit',
        price: 300.00,
        totalValue: 1500.00
      });

      const orders = await dataLayer.getUserOrders(user.userId);

      expect(orders.length).toBe(2);
      expect(orders.every(o => o.userId === user.userId)).toBe(true);
    });

    it('should update an order', async () => {
      const user = await dataLayer.createUser({
        email: 'order4@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const order = await dataLayer.createOrder({
        userId: user.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market',
        price: 150.00,
        totalValue: 1500.00
      });

      const updatedOrder = await dataLayer.updateOrder(order.orderId, {
        status: 'filled',
        filledAt: new Date().toISOString()
      });

      expect(updatedOrder.status).toBe('filled');
      expect(updatedOrder.filledAt).toBeDefined();
    });

    it('should return null when updating non-existent order', async () => {
      const result = await dataLayer.updateOrder('non_existent_order', {
        status: 'filled'
      });
      expect(result).toBeNull();
    });
  });

  describe('Ledger Operations', () => {
    it('should add a ledger entry', async () => {
      const user = await dataLayer.createUser({
        email: 'ledger@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const wallet = await dataLayer.createWallet(user.userId, 10000);

      const entry = await dataLayer.addLedgerEntry({
        walletId: wallet.walletId,
        orderId: 'order_123',
        debit: 1500.00,
        credit: 0,
        description: 'Buy 10 AAPL @ 150'
      });

      expect(entry).toBeDefined();
      expect(entry.txId).toBeDefined();
      expect(entry.walletId).toBe(wallet.walletId);
      expect(entry.debit).toBe(1500.00);
      expect(entry.credit).toBe(0);
      expect(entry.timestamp).toBeDefined();
    });

    it('should get ledger entries for a wallet', async () => {
      const user = await dataLayer.createUser({
        email: 'ledger2@example.com',
        passwordHash: 'hash',
        role: 'investor'
      });

      const wallet = await dataLayer.createWallet(user.userId, 10000);

      await dataLayer.addLedgerEntry({
        walletId: wallet.walletId,
        orderId: 'order_1',
        debit: 1500.00,
        credit: 0,
        description: 'Buy AAPL'
      });

      await dataLayer.addLedgerEntry({
        walletId: wallet.walletId,
        orderId: 'order_2',
        debit: 0,
        credit: 2000.00,
        description: 'Sell GOOGL'
      });

      const ledger = await dataLayer.getLedger(wallet.walletId);

      expect(ledger.length).toBe(2);
      expect(ledger.every(entry => entry.walletId === wallet.walletId)).toBe(true);
    });
  });

  describe('Basket Operations', () => {
    it('should create a basket', async () => {
      const basketData = {
        symbol: 'AAPL',
        netQuantity: 0,
        orders: []
      };

      const basket = await dataLayer.createBasket(basketData);

      expect(basket).toBeDefined();
      expect(basket.basketId).toBeDefined();
      expect(basket.symbol).toBe('AAPL');
      expect(basket.netQuantity).toBe(0);
      expect(basket.orders).toEqual([]);
      expect(basket.createdAt).toBeDefined();
    });

    it('should get a basket by basketId', async () => {
      const createdBasket = await dataLayer.createBasket({
        symbol: 'GOOGL',
        netQuantity: 0,
        orders: []
      });

      const retrievedBasket = await dataLayer.getBasket(createdBasket.basketId);

      expect(retrievedBasket).toBeDefined();
      expect(retrievedBasket.basketId).toBe(createdBasket.basketId);
      expect(retrievedBasket.symbol).toBe('GOOGL');
    });

    it('should return null for non-existent basket', async () => {
      const basket = await dataLayer.getBasket('non_existent_basket');
      expect(basket).toBeNull();
    });

    it('should update a basket', async () => {
      const basket = await dataLayer.createBasket({
        symbol: 'MSFT',
        netQuantity: 0,
        orders: []
      });

      const updatedBasket = await dataLayer.updateBasket(basket.basketId, {
        netQuantity: 10,
        status: 'executed'
      });

      expect(updatedBasket.netQuantity).toBe(10);
      expect(updatedBasket.status).toBe('executed');
    });

    it('should return null when updating non-existent basket', async () => {
      const result = await dataLayer.updateBasket('non_existent_basket', {
        status: 'executed'
      });
      expect(result).toBeNull();
    });
  });

  describe('Stock Data Loading', () => {
    it('should load stock data for a valid ticker', async () => {
      // This test assumes there's at least one stock data file in the data directory
      const tickers = await getAvailableTickers();
      
      if (tickers.length > 0) {
        const data = await loadStockData(tickers[0]);
        
        // If data exists, it should be an array
        expect(Array.isArray(data)).toBe(true);
        
        if (data.length > 0) {
          expect(data[0]).toHaveProperty('ticker');
          expect(data[0]).toHaveProperty('date');
          expect(data[0]).toHaveProperty('close');
          expect(data[0]).toHaveProperty('open');
          expect(data[0]).toHaveProperty('high');
          expect(data[0]).toHaveProperty('low');
          expect(data[0]).toHaveProperty('volume');
        }
      }
    });

    it('should return empty array for non-existent ticker', async () => {
      const data = await loadStockData('NONEXISTENTTICKER123');
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('should get available tickers', async () => {
      const tickers = await getAvailableTickers();
      
      expect(Array.isArray(tickers)).toBe(true);
      
      // If there are tickers, they should be uppercase strings
      if (tickers.length > 0) {
        expect(typeof tickers[0]).toBe('string');
        expect(tickers[0]).toBe(tickers[0].toUpperCase());
      }
    });
  });
});

