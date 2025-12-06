import express from 'express';
import { unifiedDataLayer as dataLayer } from '../data/unifiedDataLayer.js';
import { PortfolioManager } from '../services/portfolioManager.js';
import { QuantService } from '../services/quantService.js';
import { TwelveDataService } from '../services/twelveDataService.js';

const router = express.Router();

// Get user portfolios
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const portfolios = await dataLayer.getUserPortfolios(userId);
    
    // Enrich with positions and real-time prices
    const enrichedPortfolios = await Promise.all(
      portfolios.map(async (portfolio) => {
        const positions = await dataLayer.getPortfolioPositions(portfolio.portfolioId);
        
        // Fetch real-time prices for all positions
        const positionsWithPrices = await Promise.all(
          positions.map(async (position) => {
            try {
              const quote = await TwelveDataService.getRealTimeQuote(position.ticker);
              const currentPrice = quote.close || quote.price || position.avgCost;
              const currentValue = position.shares * currentPrice;
              const costBasis = position.shares * position.avgCost;
              const unrealizedPnL = currentValue - costBasis;
              
              return {
                ...position,
                currentPrice,
                currentValue,
                unrealizedPnL
              };
            } catch (error) {
              console.warn(`Failed to fetch price for ${position.ticker}:`, error.message);
              // Use avgCost as fallback
              return {
                ...position,
                currentPrice: position.avgCost,
                currentValue: position.shares * position.avgCost,
                unrealizedPnL: 0
              };
            }
          })
        );
        
        const totalValue = PortfolioManager.calculateTotalValue(positionsWithPrices);
        const unrealizedPnL = PortfolioManager.calculateUnrealizedPnL(positionsWithPrices);
        
        return {
          ...portfolio,
          positions: positionsWithPrices,
          totalValue,
          unrealizedPnL
        };
      })
    );
    
    res.json(enrichedPortfolios);
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolios' });
  }
});

// Get portfolio details
router.get('/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const portfolio = await dataLayer.getPortfolio(portfolioId);
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const positions = await dataLayer.getPortfolioPositions(portfolioId);
    
    // Fetch real-time prices for all positions
    const positionsWithPrices = await Promise.all(
      positions.map(async (position) => {
        try {
          const quote = await TwelveDataService.getRealTimeQuote(position.ticker);
          const currentPrice = quote.close || quote.price || position.avgCost;
          const currentValue = position.shares * currentPrice;
          const costBasis = position.shares * position.avgCost;
          const unrealizedPnL = currentValue - costBasis;
          
          return {
            ...position,
            currentPrice,
            currentValue,
            unrealizedPnL
          };
        } catch (error) {
          console.warn(`Failed to fetch price for ${position.ticker}:`, error.message);
          // Use avgCost as fallback
          return {
            ...position,
            currentPrice: position.avgCost,
            currentValue: position.shares * position.avgCost,
            unrealizedPnL: 0
          };
        }
      })
    );
    
    const totalValue = PortfolioManager.calculateTotalValue(positionsWithPrices);
    const unrealizedPnL = PortfolioManager.calculateUnrealizedPnL(positionsWithPrices);
    
    res.json({
      ...portfolio,
      positions: positionsWithPrices,
      totalValue,
      unrealizedPnL
    });
  } catch (error) {
    console.error('Portfolio details error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio details' });
  }
});

// Generate portfolio
router.post('/generate', async (req, res) => {
  try {
    const { userId, numStocks = 20, benchmark = 'SPY' } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get quant recommendations
    let recommendations;
    try {
      recommendations = await QuantService.generatePortfolioRecommendations({
        numStocks,
        benchmark
      });
    } catch (error) {
      console.error('Quant service error:', error);
      return res.status(500).json({ 
        error: `Failed to generate portfolio: ${error.message}` 
      });
    }
    
    if (!recommendations || recommendations.length === 0) {
      return res.status(404).json({ 
        error: 'No recommendations available. Please check that ticker data files exist in the data folder.' 
      });
    }
    
    // Create or update portfolio
    let portfolios = await dataLayer.getUserPortfolios(userId);
    let portfolio = portfolios && portfolios.length > 0 ? portfolios[0] : null;
    
    if (!portfolio) {
      portfolio = await dataLayer.createPortfolio({
        userId,
        benchmark,
        strategyId: 'quant_generated',
        holdings: recommendations.map(r => r.ticker),
        targetWeights: recommendations.reduce((acc, r) => {
          acc[r.ticker] = r.weight;
          return acc;
        }, {})
      });
    } else {
      await dataLayer.updatePortfolio(portfolio.portfolioId, {
        holdings: recommendations.map(r => r.ticker),
        targetWeights: recommendations.reduce((acc, r) => {
          acc[r.ticker] = r.weight;
          return acc;
        }, {})
      });
      portfolio = await dataLayer.getPortfolio(portfolio.portfolioId);
    }
    
    res.json({
      portfolio,
      recommendations
    });
  } catch (error) {
    console.error('Portfolio generation error:', error);
    res.status(500).json({ 
      error: `Failed to generate portfolio: ${error.message || 'Unknown error'}` 
    });
  }
});

// Rebalance portfolio
router.post('/:portfolioId/rebalance', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const portfolio = await dataLayer.getPortfolio(portfolioId);
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const positions = await dataLayer.getPortfolioPositions(portfolioId);
    const rebalanceInstructions = PortfolioManager.generateRebalanceInstructions(
      portfolio,
      positions
    );
    
    res.json({
      instructions: rebalanceInstructions,
      message: 'Rebalancing instructions generated'
    });
  } catch (error) {
    console.error('Rebalance error:', error);
    res.status(500).json({ error: 'Failed to rebalance portfolio' });
  }
});

export default router;

