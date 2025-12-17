import { Router, Request, Response } from 'express';
import { portfolioService } from '../services/portfolioService';
import { positionService } from '../services/positionService';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { createPortfolioSchema } from '../utils/validators';
import { handleError } from '../utils/errors';
import { ApiResponse } from '../types';

const router = Router();

// All portfolio routes require authentication
router.use(authMiddleware);

/**
 * POST /api/portfolios
 * Module 10.1: Create portfolio
 */
router.post(
  '/',
  validateBody(createPortfolioSchema),
  async (req: Request, res: Response) => {
    try {
      const portfolio = await portfolioService.create(req.user!.userId, req.body);
      
      const response: ApiResponse<typeof portfolio> = {
        success: true,
        data: portfolio,
      };
      
      res.status(201).json(response);
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * GET /api/portfolios
 * Get all portfolios for current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const portfolios = await portfolioService.getAllForUser(req.user!.userId);
    
    const response: ApiResponse<typeof portfolios> = {
      success: true,
      data: portfolios,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/portfolios/:id
 * Module 10.2: Retrieve portfolio state
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const portfolio = await portfolioService.getById(req.params.id, req.user!.userId);
    
    const response: ApiResponse<typeof portfolio> = {
      success: true,
      data: portfolio,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/portfolios/:id/valuation
 * Module 11: Portfolio Valuation + P&L
 */
router.get('/:id/valuation', async (req: Request, res: Response) => {
  try {
    const valuation = await portfolioService.getValuation(req.params.id, req.user!.userId);
    
    const response: ApiResponse<typeof valuation> = {
      success: true,
      data: valuation,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/portfolios/:id/positions
 * Get all positions for a portfolio
 */
router.get('/:id/positions', async (req: Request, res: Response) => {
  try {
    // Verify ownership
    await portfolioService.getById(req.params.id, req.user!.userId);
    
    const positions = await positionService.getAllForPortfolio(req.params.id);
    
    const response: ApiResponse<typeof positions> = {
      success: true,
      data: positions,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

export default router;

