import { PortfolioManager } from '../../src/services/portfolioManager.js';

describe('PortfolioManager', () => {
  describe('calculateTotalValue', () => {
    it('should calculate total value of positions', () => {
      const positions = [
        { shares: 10, currentPrice: 150.00, avgCost: 145.00 },
        { shares: 5, currentPrice: 2000.00, avgCost: 1950.00 },
        { shares: 20, avgCost: 50.00 } // No currentPrice, should use avgCost
      ];

      const totalValue = PortfolioManager.calculateTotalValue(positions);

      expect(totalValue).toBe(10 * 150.00 + 5 * 2000.00 + 20 * 50.00);
      expect(totalValue).toBe(11500.00);
    });

    it('should return 0 for empty positions array', () => {
      const totalValue = PortfolioManager.calculateTotalValue([]);
      expect(totalValue).toBe(0);
    });

    it('should handle positions with only avgCost', () => {
      const positions = [
        { shares: 10, avgCost: 100.00 }
      ];

      const totalValue = PortfolioManager.calculateTotalValue(positions);
      expect(totalValue).toBe(1000.00);
    });

    it('should handle positions with zero shares', () => {
      const positions = [
        { shares: 0, currentPrice: 150.00, avgCost: 145.00 },
        { shares: 5, currentPrice: 200.00, avgCost: 195.00 }
      ];

      const totalValue = PortfolioManager.calculateTotalValue(positions);
      expect(totalValue).toBe(1000.00);
    });
  });

  describe('calculateUnrealizedPnL', () => {
    it('should calculate unrealized profit and loss correctly', () => {
      const positions = [
        { shares: 10, currentPrice: 155.00, avgCost: 150.00 }, // +50 profit
        { shares: 5, currentPrice: 1950.00, avgCost: 2000.00 }, // -250 loss
        { shares: 20, avgCost: 50.00 } // No currentPrice, should use avgCost (0 PnL)
      ];

      const unrealizedPnL = PortfolioManager.calculateUnrealizedPnL(positions);

      expect(unrealizedPnL).toBe(50 - 250 + 0);
      expect(unrealizedPnL).toBe(-200.00);
    });

    it('should return 0 for empty positions array', () => {
      const unrealizedPnL = PortfolioManager.calculateUnrealizedPnL([]);
      expect(unrealizedPnL).toBe(0);
    });

    it('should calculate profit when current price is higher than avg cost', () => {
      const positions = [
        { shares: 100, currentPrice: 110.00, avgCost: 100.00 }
      ];

      const unrealizedPnL = PortfolioManager.calculateUnrealizedPnL(positions);
      expect(unrealizedPnL).toBe(1000.00);
    });

    it('should calculate loss when current price is lower than avg cost', () => {
      const positions = [
        { shares: 100, currentPrice: 90.00, avgCost: 100.00 }
      ];

      const unrealizedPnL = PortfolioManager.calculateUnrealizedPnL(positions);
      expect(unrealizedPnL).toBe(-1000.00);
    });

    it('should use avgCost when currentPrice is not available', () => {
      const positions = [
        { shares: 10, avgCost: 150.00 }
      ];

      const unrealizedPnL = PortfolioManager.calculateUnrealizedPnL(positions);
      expect(unrealizedPnL).toBe(0);
    });
  });

  describe('generateRebalanceInstructions', () => {
    it('should generate rebalance instructions when weights differ', () => {
      const portfolio = {
        portfolioId: 'portfolio_1',
        targetWeights: {
          'AAPL': 0.5,
          'GOOGL': 0.3,
          'MSFT': 0.2
        }
      };

      const positions = [
        { ticker: 'AAPL', shares: 10, currentPrice: 150.00, avgCost: 150.00 }, // 1500 / 3000 = 0.5 (correct)
        { ticker: 'GOOGL', shares: 1, currentPrice: 2000.00, avgCost: 2000.00 }, // 2000 / 3000 = 0.67 (too high)
        { ticker: 'MSFT', shares: 2, currentPrice: 300.00, avgCost: 300.00 } // 600 / 3000 = 0.2 (correct)
      ];

      const instructions = PortfolioManager.generateRebalanceInstructions(portfolio, positions);

      expect(instructions.length).toBeGreaterThan(0);
      
      const googlInstruction = instructions.find(i => i.ticker === 'GOOGL');
      expect(googlInstruction).toBeDefined();
      expect(googlInstruction.action).toBe('sell');
      expect(googlInstruction.currentWeight).toBeCloseTo(0.67, 2);
      expect(googlInstruction.targetWeight).toBe(0.3);
    });

    it('should not generate instructions when weights are within threshold', () => {
      const portfolio = {
        portfolioId: 'portfolio_1',
        targetWeights: {
          'AAPL': 0.5,
          'GOOGL': 0.5
        }
      };

      const positions = [
        { ticker: 'AAPL', shares: 10, currentPrice: 100.00, avgCost: 100.00 }, // 0.5
        { ticker: 'GOOGL', shares: 10, currentPrice: 100.00, avgCost: 100.00 } // 0.5
      ];

      const instructions = PortfolioManager.generateRebalanceInstructions(portfolio, positions);

      expect(instructions.length).toBe(0);
    });

    it('should handle empty positions', () => {
      const portfolio = {
        portfolioId: 'portfolio_1',
        targetWeights: {
          'AAPL': 0.5,
          'GOOGL': 0.5
        }
      };

      const positions = [];

      const instructions = PortfolioManager.generateRebalanceInstructions(portfolio, positions);

      expect(instructions.length).toBeGreaterThan(0);
      instructions.forEach(instruction => {
        expect(instruction.action).toBe('buy');
        expect(instruction.currentWeight).toBe(0);
      });
    });

    it('should handle positions not in target weights', () => {
      const portfolio = {
        portfolioId: 'portfolio_1',
        targetWeights: {
          'AAPL': 1.0
        }
      };

      const positions = [
        { ticker: 'GOOGL', shares: 10, currentPrice: 100.00, avgCost: 100.00 }
      ];

      const instructions = PortfolioManager.generateRebalanceInstructions(portfolio, positions);

      // Should generate buy instruction for AAPL
      const aaplInstruction = instructions.find(i => i.ticker === 'AAPL');
      expect(aaplInstruction).toBeDefined();
      expect(aaplInstruction.action).toBe('buy');
    });

    it('should calculate correct value changes', () => {
      const portfolio = {
        portfolioId: 'portfolio_1',
        targetWeights: {
          'AAPL': 0.6,
          'GOOGL': 0.4
        }
      };

      const positions = [
        { ticker: 'AAPL', shares: 5, currentPrice: 100.00, avgCost: 100.00 }, // 500 / 1000 = 0.5
        { ticker: 'GOOGL', shares: 5, currentPrice: 100.00, avgCost: 100.00 } // 500 / 1000 = 0.5
      ];

      const instructions = PortfolioManager.generateRebalanceInstructions(portfolio, positions);

      const aaplInstruction = instructions.find(i => i.ticker === 'AAPL');
      expect(aaplInstruction).toBeDefined();
      expect(aaplInstruction.valueChange).toBeCloseTo(100, 2); // Need to buy 100 worth
    });
  });

  describe('markToMarket', () => {
    it('should update positions with current prices', () => {
      const positions = [
        { ticker: 'AAPL', shares: 10, avgCost: 150.00 },
        { ticker: 'GOOGL', shares: 5, avgCost: 2000.00 }
      ];

      const priceData = {
        'AAPL': 155.00,
        'GOOGL': 2100.00
      };

      const markedPositions = PortfolioManager.markToMarket(positions, priceData);

      expect(markedPositions.length).toBe(2);
      expect(markedPositions[0].currentPrice).toBe(155.00);
      expect(markedPositions[0].currentValue).toBe(1550.00);
      expect(markedPositions[0].unrealizedPnL).toBe(50.00);

      expect(markedPositions[1].currentPrice).toBe(2100.00);
      expect(markedPositions[1].currentValue).toBe(10500.00);
      expect(markedPositions[1].unrealizedPnL).toBe(500.00);
    });

    it('should use avgCost when price data is missing', () => {
      const positions = [
        { ticker: 'AAPL', shares: 10, avgCost: 150.00 }
      ];

      const priceData = {};

      const markedPositions = PortfolioManager.markToMarket(positions, priceData);

      expect(markedPositions[0].currentPrice).toBe(150.00);
      expect(markedPositions[0].unrealizedPnL).toBe(0);
    });

    it('should handle empty positions array', () => {
      const markedPositions = PortfolioManager.markToMarket([], {});
      expect(markedPositions).toEqual([]);
    });

    it('should preserve all position properties', () => {
      const positions = [
        { 
          ticker: 'AAPL', 
          shares: 10, 
          avgCost: 150.00,
          positionId: 'pos_1',
          portfolioId: 'portfolio_1'
        }
      ];

      const priceData = { 'AAPL': 155.00 };

      const markedPositions = PortfolioManager.markToMarket(positions, priceData);

      expect(markedPositions[0].positionId).toBe('pos_1');
      expect(markedPositions[0].portfolioId).toBe('portfolio_1');
      expect(markedPositions[0].ticker).toBe('AAPL');
      expect(markedPositions[0].shares).toBe(10);
    });
  });
});

