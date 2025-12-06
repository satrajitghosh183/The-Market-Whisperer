import express from 'express';
import { unifiedDataLayer as dataLayer } from '../data/unifiedDataLayer.js';
import { PortfolioPerformanceService } from '../services/portfolioPerformanceService.js';

const router = express.Router();

/**
 * Get portfolio performance history
 * GET /api/performance/history/:portfolioId
 */
router.get('/history/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { userId } = req.query;
    const days = parseInt(req.query.days) || 30;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const history = await PortfolioPerformanceService.getPerformanceHistory(
      portfolioId,
      userId,
      days
    );

    res.json({
      success: true,
      history,
      days
    });
  } catch (error) {
    console.error('Get performance history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance history'
    });
  }
});

/**
 * Get current portfolio performance
 * GET /api/performance/current/:portfolioId
 */
router.get('/current/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const performance = await PortfolioPerformanceService.getCurrentPerformance(
      portfolioId,
      userId
    );

    res.json({
      success: true,
      performance
    });
  } catch (error) {
    console.error('Get current performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current performance'
    });
  }
});

/**
 * Create portfolio snapshot
 * POST /api/performance/snapshot
 */
router.post('/snapshot', async (req, res) => {
  try {
    const { portfolioId, userId } = req.body;

    if (!portfolioId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Portfolio ID and User ID are required'
      });
    }

    const snapshot = await PortfolioPerformanceService.createSnapshot(
      portfolioId,
      userId
    );

    res.json({
      success: true,
      snapshot
    });
  } catch (error) {
    console.error('Create snapshot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create snapshot'
    });
  }
});

export default router;

