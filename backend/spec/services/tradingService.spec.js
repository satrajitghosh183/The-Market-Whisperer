import { TradingService } from '../../src/services/tradingService.js';
import { dataLayer, initializeDataLayer, loadStockData } from '../../src/data/dataLayer.js';
import { BasketManager } from '../../src/services/basketManager.js';

describe('TradingService', () => {
  let testUser;
  let testWallet;
  let testPortfolio;

  beforeEach(async () => {
    await initializeDataLayer();
    
    // Create test user
    testUser = await dataLayer.createUser({
      email: 'trader@test.com',
      passwordHash: 'hash',
      role: 'trader'
    });

    // Create test wallet
    testWallet = await dataLayer.createWallet(testUser.userId, 10000);

    // Create test portfolio
    testPortfolio = await dataLayer.createPortfolio({
      userId: testUser.userId,
      benchmark: 'SPY',
      strategyId: 'default',
      holdings: [],
      targetWeights: {}
    });

    // Setup spies - Note: For ES modules, we spy on the imported functions
    // In actual test execution, these would need to be properly mocked
    // For now, tests will use actual implementations where possible
    spyOn(BasketManager, 'addOrderToBasket').and.returnValue(Promise.resolve({}));
  });

  describe('placeOrder', () => {
    it('should place a market buy order successfully', async () => {
      const order = await TradingService.placeOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market'
      });

      expect(order).toBeDefined();
      expect(order.orderId).toBeDefined();
      expect(order.ticker).toBe('AAPL');
      expect(order.quantity).toBe(10);
      expect(order.side).toBe('buy');
      expect(order.orderType).toBe('market');
      expect(order.price).toBe(150.00);
      expect(order.totalValue).toBe(1500.00);
      expect(order.status).toBe('pending');

      // Verify wallet was updated
      const updatedWallet = await dataLayer.getWallet(testUser.userId);
      expect(updatedWallet.availableBalance).toBe(8500.00);
      expect(updatedWallet.lockedBalance).toBe(1500.00);
    });

    it('should place a limit buy order with specified price', async () => {
      const order = await TradingService.placeOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'limit',
        price: 145.00
      });

      expect(order.price).toBe(145.00);
      expect(order.totalValue).toBe(1450.00);
    });

    it('should place a sell order without checking funds', async () => {
      const order = await TradingService.placeOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'sell',
        orderType: 'market'
      });

      expect(order.side).toBe('sell');
      expect(order.status).toBe('pending');

      // Wallet should not be locked for sell orders
      const wallet = await dataLayer.getWallet(testUser.userId);
      expect(wallet.availableBalance).toBe(10000.00);
    });

    it('should throw error for insufficient funds', async () => {
      await expect(
        TradingService.placeOrder({
          userId: testUser.userId,
          ticker: 'AAPL',
          quantity: 1000, // Too many shares
          side: 'buy',
          orderType: 'market'
        })
      ).rejects.toThrow('Insufficient funds');
    });

    it('should throw error when wallet not found', async () => {
      await expect(
        TradingService.placeOrder({
          userId: 'non_existent_user',
          ticker: 'AAPL',
          quantity: 10,
          side: 'buy',
          orderType: 'market'
        })
      ).rejects.toThrow('Wallet not found');
    });

    it('should throw error when no price data available', async () => {
      // This test requires actual data files or proper mocking setup
      // For now, we test the error path structure
      // In a real scenario, you'd mock loadStockData to return empty array

      await expect(
        TradingService.placeOrder({
          userId: testUser.userId,
          ticker: 'INVALID',
          quantity: 10,
          side: 'buy',
          orderType: 'market'
        })
      ).rejects.toThrow('No price data available');
    });

    it('should add order to basket', async () => {
      await TradingService.placeOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market'
      });

      expect(BasketManager.addOrderToBasket).toHaveBeenCalled();
    });
  });

  describe('executeOrder', () => {
    it('should execute a buy order and create position', async () => {
      const order = await TradingService.placeOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market'
      });

      const result = await TradingService.executeOrder(order.orderId);

      expect(result).toBeDefined();
      expect(result.order.status).toBe('filled');
      expect(result.position).toBeDefined();
      expect(result.position.ticker).toBe('AAPL');
      expect(result.position.shares).toBe(10);
      expect(result.position.avgCost).toBe(150.00);

      // Verify wallet unlocked
      const wallet = await dataLayer.getWallet(testUser.userId);
      expect(wallet.lockedBalance).toBe(0);

      // Verify ledger entry
      const ledger = await dataLayer.getLedger(wallet.walletId);
      expect(ledger.length).toBe(1);
      expect(ledger[0].debit).toBe(1500.00);
    });

    it('should execute a buy order and update existing position', async () => {
      // Create initial position
      await dataLayer.createPosition({
        portfolioId: testPortfolio.portfolioId,
        ticker: 'AAPL',
        shares: 5,
        avgCost: 145.00,
        currentPrice: 150.00
      });

      const order = await TradingService.placeOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market'
      });

      const result = await TradingService.executeOrder(order.orderId);

      expect(result.position.shares).toBe(15);
      // Average cost should be recalculated: (5*145 + 10*150) / 15 = 148.33
      expect(result.position.avgCost).toBeCloseTo(148.33, 2);
    });

    it('should execute a sell order and reduce position', async () => {
      // Create initial position
      await dataLayer.createPosition({
        portfolioId: testPortfolio.portfolioId,
        ticker: 'AAPL',
        shares: 20,
        avgCost: 145.00,
        currentPrice: 150.00
      });

      const order = await TradingService.placeOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'sell',
        orderType: 'market'
      });

      const result = await TradingService.executeOrder(order.orderId);

      expect(result.order.status).toBe('filled');
      expect(result.position.shares).toBe(10);
      expect(result.position.realizedPnL).toBe(50.00); // 10 * (150 - 145)

      // Verify wallet credited
      const wallet = await dataLayer.getWallet(testUser.userId);
      expect(wallet.availableBalance).toBe(11500.00);

      // Verify ledger entry
      const ledger = await dataLayer.getLedger(wallet.walletId);
      expect(ledger[0].credit).toBe(1500.00);
    });

    it('should close position when selling all shares', async () => {
      await dataLayer.createPosition({
        portfolioId: testPortfolio.portfolioId,
        ticker: 'AAPL',
        shares: 10,
        avgCost: 145.00,
        currentPrice: 150.00
      });

      const order = await TradingService.placeOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'sell',
        orderType: 'market'
      });

      const result = await TradingService.executeOrder(order.orderId);

      expect(result.position.shares).toBe(0);
      expect(result.position.realizedPnL).toBe(50.00);
    });

    it('should throw error for insufficient shares', async () => {
      await dataLayer.createPosition({
        portfolioId: testPortfolio.portfolioId,
        ticker: 'AAPL',
        shares: 5,
        avgCost: 145.00,
        currentPrice: 150.00
      });

      const order = await TradingService.placeOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'sell',
        orderType: 'market'
      });

      await expect(
        TradingService.executeOrder(order.orderId)
      ).rejects.toThrow('Insufficient shares');
    });

    it('should return null for non-existent order', async () => {
      const result = await TradingService.executeOrder('non_existent_order');
      expect(result).toBeNull();
    });

    it('should return null for already filled order', async () => {
      const order = await TradingService.placeOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market'
      });

      await TradingService.executeOrder(order.orderId);
      const result = await TradingService.executeOrder(order.orderId);

      expect(result).toBeNull();
    });

    it('should throw error when portfolio not found', async () => {
      const userWithoutPortfolio = await dataLayer.createUser({
        email: 'noportfolio@test.com',
        passwordHash: 'hash',
        role: 'trader'
      });

      await dataLayer.createWallet(userWithoutPortfolio.userId, 10000);

      const order = await TradingService.placeOrder({
        userId: userWithoutPortfolio.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market'
      });

      await expect(
        TradingService.executeOrder(order.orderId)
      ).rejects.toThrow('Portfolio not found');
    });
  });

  describe('placeCoupledTrade', () => {
    it('should place and execute coupled trade', async () => {
      // Create position for short side
      await dataLayer.createPosition({
        portfolioId: testPortfolio.portfolioId,
        ticker: 'SPY',
        shares: 10,
        avgCost: 400.00,
        currentPrice: 400.00
      });

      // Note: In actual implementation, you'd mock loadStockData here
      // For now, this test structure demonstrates the expected behavior

      const coupledTrade = await TradingService.placeCoupledTrade({
        userId: testUser.userId,
        longTicker: 'AAPL',
        shortTicker: 'SPY',
        longQuantity: 10,
        shortQuantity: 10
      });

      expect(coupledTrade).toBeDefined();
      expect(coupledTrade.coupledTradeId).toBeDefined();
      expect(coupledTrade.longOrder).toBeDefined();
      expect(coupledTrade.shortOrder).toBeDefined();
      expect(coupledTrade.longOrder.ticker).toBe('AAPL');
      expect(coupledTrade.shortOrder.ticker).toBe('SPY');
      expect(coupledTrade.hedgeRatio).toBe(1.0);
      expect(coupledTrade.expectedBeta).toBe(0);
    });

    it('should handle errors in coupled trade', async () => {
      loadStockData.mockResolvedValue([]);

      await expect(
        TradingService.placeCoupledTrade({
          userId: testUser.userId,
          longTicker: 'INVALID',
          shortTicker: 'SPY',
          longQuantity: 10,
          shortQuantity: 10
        })
      ).rejects.toThrow();
    });
  });
});

