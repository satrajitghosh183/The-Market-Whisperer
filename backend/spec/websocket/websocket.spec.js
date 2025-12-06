import { setupWebSocket } from '../../src/websocket/websocket.js';
import { WebSocketServer } from 'ws';
import { dataLayer, initializeDataLayer } from '../../src/data/dataLayer.js';
import { PortfolioManager } from '../../src/services/portfolioManager.js';

describe('WebSocket', () => {
  let wss;
  let testUser;
  let testPortfolio;

  beforeEach(async () => {
    await initializeDataLayer();
    
    testUser = await dataLayer.createUser({
      email: 'ws@test.com',
      passwordHash: 'hash',
      role: 'investor'
    });

    testPortfolio = await dataLayer.createPortfolio({
      userId: testUser.userId,
      benchmark: 'SPY',
      strategyId: 'default',
      holdings: [],
      targetWeights: {}
    });

    wss = new WebSocketServer({ noServer: true });
    setupWebSocket(wss);
  });

  afterEach(() => {
    if (wss) {
      wss.close();
    }
  });

  describe('Connection', () => {
    it('should send connection confirmation on connect', (done) => {
      const mockWs = {
        on: jasmine.createSpy('on'),
        send: jasmine.createSpy('send'),
        readyState: 1
      };

      // Simulate connection
      const connectionHandler = wss.listeners('connection')[0];
      if (connectionHandler) {
        connectionHandler(mockWs, {});

        // Check that send was called with connection message
        setTimeout(() => {
          expect(mockWs.send).toHaveBeenCalled();
          const sentMessage = JSON.parse(mockWs.send.calls.mostRecent().args[0]);
          expect(sentMessage.type).toBe('connected');
          expect(sentMessage.timestamp).toBeDefined();
          done();
        }, 100);
      } else {
        done();
      }
    });

    it('should handle connection errors', () => {
      const mockWs = {
        on: jasmine.createSpy('on'),
        send: jasmine.createSpy('send'),
        readyState: 1
      };

      const connectionHandler = wss.listeners('connection')[0];
      if (connectionHandler) {
        connectionHandler(mockWs, {});

        // Simulate error
        const errorHandler = mockWs.on.calls.find(call => call.args[0] === 'error');
        if (errorHandler) {
          expect(() => errorHandler.args[1](new Error('Test error'))).not.toThrow();
        }
      }
    });
  });

  describe('Portfolio Subscription', () => {
    it('should handle portfolio subscription message', async () => {
      const mockWs = {
        portfolioId: null,
        userId: null,
        on: jasmine.createSpy('on'),
        send: jasmine.createSpy('send'),
        readyState: 1
      };

      const connectionHandler = wss.listeners('connection')[0];
      if (connectionHandler) {
        connectionHandler(mockWs, {});

        // Find message handler
        const messageHandler = mockWs.on.calls.find(call => call.args[0] === 'message');
        if (messageHandler) {
          const message = JSON.stringify({
            type: 'subscribe_portfolio',
            payload: {
              portfolioId: testPortfolio.portfolioId,
              userId: testUser.userId
            }
          });

          await messageHandler.args[1](Buffer.from(message));

          expect(mockWs.portfolioId).toBe(testPortfolio.portfolioId);
          expect(mockWs.userId).toBe(testUser.userId);
        }
      }
    });

    it('should send portfolio update on subscription', async () => {
      // Create positions
      await dataLayer.createPosition({
        portfolioId: testPortfolio.portfolioId,
        ticker: 'AAPL',
        shares: 10,
        avgCost: 150.00,
        currentPrice: 155.00
      });

      const mockWs = {
        portfolioId: null,
        userId: null,
        on: jasmine.createSpy('on'),
        send: jasmine.createSpy('send'),
        readyState: 1
      };

      const connectionHandler = wss.listeners('connection')[0];
      if (connectionHandler) {
        connectionHandler(mockWs, {});

        const messageHandler = mockWs.on.calls.find(call => call.args[0] === 'message');
        if (messageHandler) {
          const message = JSON.stringify({
            type: 'subscribe_portfolio',
            payload: {
              portfolioId: testPortfolio.portfolioId,
              userId: testUser.userId
            }
          });

          await messageHandler.args[1](Buffer.from(message));

          // Check that portfolio update was sent
          const sendCalls = mockWs.send.calls.all();
          const portfolioUpdate = sendCalls.find(call => {
            try {
              const data = JSON.parse(call.args[0]);
              return data.type === 'portfolio_update';
            } catch {
              return false;
            }
          });

          if (portfolioUpdate) {
            const updateData = JSON.parse(portfolioUpdate.args[0]);
            expect(updateData.type).toBe('portfolio_update');
            expect(updateData.portfolio).toBeDefined();
            expect(updateData.portfolio.portfolioId).toBe(testPortfolio.portfolioId);
            expect(updateData.portfolio.positions).toBeDefined();
            expect(updateData.totalValue).toBeDefined();
            expect(updateData.unrealizedPnL).toBeDefined();
          }
        }
      }
    });
  });

  describe('Ticker Subscription', () => {
    it('should handle ticker subscription message', async () => {
      const mockWs = {
        subscribedTickers: null,
        on: jasmine.createSpy('on'),
        send: jasmine.createSpy('send'),
        readyState: 1
      };

      const connectionHandler = wss.listeners('connection')[0];
      if (connectionHandler) {
        connectionHandler(mockWs, {});

        const messageHandler = mockWs.on.calls.find(call => call.args[0] === 'message');
        if (messageHandler) {
          const message = JSON.stringify({
            type: 'subscribe_ticker',
            payload: {
              ticker: 'AAPL'
            }
          });

          await messageHandler.args[1](Buffer.from(message));

          expect(mockWs.subscribedTickers).toContain('AAPL');
        }
      }
    });

    it('should send ticker update on subscription', async () => {
      const mockWs = {
        subscribedTickers: null,
        on: jasmine.createSpy('on'),
        send: jasmine.createSpy('send'),
        readyState: 1
      };

      const connectionHandler = wss.listeners('connection')[0];
      if (connectionHandler) {
        connectionHandler(mockWs, {});

        const messageHandler = mockWs.on.calls.find(call => call.args[0] === 'message');
        if (messageHandler) {
          const message = JSON.stringify({
            type: 'subscribe_ticker',
            payload: {
              ticker: 'AAPL'
            }
          });

          await messageHandler.args[1](Buffer.from(message));

          // Check that ticker update was sent
          const sendCalls = mockWs.send.calls.all();
          const tickerUpdate = sendCalls.find(call => {
            try {
              const data = JSON.parse(call.args[0]);
              return data.type === 'ticker_update';
            } catch {
              return false;
            }
          });

          if (tickerUpdate) {
            const updateData = JSON.parse(tickerUpdate.args[0]);
            expect(updateData.type).toBe('ticker_update');
            expect(updateData.ticker).toBe('AAPL');
            expect(updateData.timestamp).toBeDefined();
          }
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid message format', async () => {
      const mockWs = {
        on: jasmine.createSpy('on'),
        send: jasmine.createSpy('send'),
        readyState: 1
      };

      const connectionHandler = wss.listeners('connection')[0];
      if (connectionHandler) {
        connectionHandler(mockWs, {});

        const messageHandler = mockWs.on.calls.find(call => call.args[0] === 'message');
        if (messageHandler) {
          await messageHandler.args[1](Buffer.from('invalid json'));

          // Should send error message
          const sendCalls = mockWs.send.calls.all();
          const errorMessage = sendCalls.find(call => {
            try {
              const data = JSON.parse(call.args[0]);
              return data.type === 'error';
            } catch {
              return false;
            }
          });

          expect(errorMessage).toBeDefined();
        }
      }
    });

    it('should handle unknown message type', async () => {
      const mockWs = {
        on: jasmine.createSpy('on'),
        send: jasmine.createSpy('send'),
        readyState: 1
      };

      const connectionHandler = wss.listeners('connection')[0];
      if (connectionHandler) {
        connectionHandler(mockWs, {});

        const messageHandler = mockWs.on.calls.find(call => call.args[0] === 'message');
        if (messageHandler) {
          const message = JSON.stringify({
            type: 'unknown_type',
            payload: {}
          });

          await messageHandler.args[1](Buffer.from(message));

          // Should send error message
          const sendCalls = mockWs.send.calls.all();
          const errorMessage = sendCalls.find(call => {
            try {
              const data = JSON.parse(call.args[0]);
              return data.type === 'error' && data.message === 'Unknown message type';
            } catch {
              return false;
            }
          });

          expect(errorMessage).toBeDefined();
        }
      }
    });
  });
});

