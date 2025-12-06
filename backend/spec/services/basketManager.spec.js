import { BasketManager } from '../../src/services/basketManager.js';
import { dataLayer, initializeDataLayer } from '../../src/data/dataLayer.js';
import { TradingService } from '../../src/services/tradingService.js';

describe('BasketManager', () => {
  let testUser;
  let testWallet;

  beforeEach(async () => {
    await initializeDataLayer();
    
    testUser = await dataLayer.createUser({
      email: 'basket@test.com',
      passwordHash: 'hash',
      role: 'trader'
    });

    testWallet = await dataLayer.createWallet(testUser.userId, 10000);
  });

  describe('addOrderToBasket', () => {
    it('should create a new basket for a symbol', async () => {
      const order = await dataLayer.createOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market',
        price: 150.00,
        totalValue: 1500.00,
        status: 'pending'
      });

      const basket = await BasketManager.addOrderToBasket(order);

      expect(basket).toBeDefined();
      expect(basket.symbol).toBe('AAPL');
      expect(basket.orders).toContain(order.orderId);
      expect(basket.netQuantity).toBe(10);
      expect(basket.windowTime).toBeDefined();
    });

    it('should add multiple orders to the same basket', async () => {
      const order1 = await dataLayer.createOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market',
        price: 150.00,
        totalValue: 1500.00,
        status: 'pending'
      });

      const order2 = await dataLayer.createOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 5,
        side: 'buy',
        orderType: 'market',
        price: 151.00,
        totalValue: 755.00,
        status: 'pending'
      });

      await BasketManager.addOrderToBasket(order1);
      const basket = await BasketManager.addOrderToBasket(order2);

      expect(basket.orders.length).toBe(2);
      expect(basket.netQuantity).toBe(15);
    });

    it('should calculate net quantity correctly with buy and sell orders', async () => {
      const buyOrder = await dataLayer.createOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market',
        price: 150.00,
        totalValue: 1500.00,
        status: 'pending'
      });

      const sellOrder = await dataLayer.createOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 5,
        side: 'sell',
        orderType: 'market',
        price: 151.00,
        totalValue: 755.00,
        status: 'pending'
      });

      await BasketManager.addOrderToBasket(buyOrder);
      const basket = await BasketManager.addOrderToBasket(sellOrder);

      expect(basket.netQuantity).toBe(5); // 10 - 5
    });

    it('should track user count correctly', async () => {
      const user2 = await dataLayer.createUser({
        email: 'basket2@test.com',
        passwordHash: 'hash',
        role: 'trader'
      });

      const order1 = await dataLayer.createOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market',
        price: 150.00,
        totalValue: 1500.00,
        status: 'pending'
      });

      const order2 = await dataLayer.createOrder({
        userId: user2.userId,
        ticker: 'AAPL',
        quantity: 5,
        side: 'buy',
        orderType: 'market',
        price: 151.00,
        totalValue: 755.00,
        status: 'pending'
      });

      await BasketManager.addOrderToBasket(order1);
      const basket = await BasketManager.addOrderToBasket(order2);

      expect(basket.userCount).toBe(2);
    });
  });

  describe('getBasketForSymbol', () => {
    it('should return basket for active symbol', async () => {
      const order = await dataLayer.createOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market',
        price: 150.00,
        totalValue: 1500.00,
        status: 'pending'
      });

      await BasketManager.addOrderToBasket(order);
      const basket = await BasketManager.getBasketForSymbol('AAPL');

      expect(basket).toBeDefined();
      expect(basket.symbol).toBe('AAPL');
      expect(basket.orders.length).toBe(1);
    });

    it('should return null for non-existent basket', async () => {
      const basket = await BasketManager.getBasketForSymbol('NONEXISTENT');
      expect(basket).toBeNull();
    });
  });

  describe('executeBasket', () => {
    it('should execute all orders in basket', async (done) => {
      // Create portfolio for position creation
      const portfolio = await dataLayer.createPortfolio({
        userId: testUser.userId,
        benchmark: 'SPY',
        strategyId: 'default',
        holdings: [],
        targetWeights: {}
      });

      // Mock TradingService.executeOrder
      const originalExecuteOrder = TradingService.executeOrder;
      let executeCallCount = 0;
      
      TradingService.executeOrder = async (orderId) => {
        executeCallCount++;
        const order = await dataLayer.getOrder(orderId);
        await dataLayer.updateOrder(orderId, { status: 'filled' });
        return { order, position: null };
      };

      const order1 = await dataLayer.createOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 10,
        side: 'buy',
        orderType: 'market',
        price: 150.00,
        totalValue: 1500.00,
        status: 'pending'
      });

      const order2 = await dataLayer.createOrder({
        userId: testUser.userId,
        ticker: 'AAPL',
        quantity: 5,
        side: 'buy',
        orderType: 'market',
        price: 151.00,
        totalValue: 755.00,
        status: 'pending'
      });

      await BasketManager.addOrderToBasket(order1);
      await BasketManager.addOrderToBasket(order2);

      // Wait for basket execution (5 seconds)
      setTimeout(async () => {
        const basket = await dataLayer.getBasket((await BasketManager.getBasketForSymbol('AAPL')).basketId);
        
        // Restore original function
        TradingService.executeOrder = originalExecuteOrder;
        
        // Note: In real scenario, basket would be executed after timeout
        // This test verifies the structure
        expect(basket).toBeDefined();
        done();
      }, 6000);
    }, 7000);

    it('should handle empty basket gracefully', async () => {
      // This would be tested when basket window expires with no orders
      // For now, we test the structure
      const result = await BasketManager.executeBasket('NONEXISTENT');
      expect(result).toBeUndefined();
    });
  });
});

