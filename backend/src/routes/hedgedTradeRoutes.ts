import { Router, Request, Response } from 'express';
import { hedgedTradeService } from '../services/hedgedTradeService';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { createHedgedTradeSchema } from '../utils/validators';
import { handleError } from '../utils/errors';
import { ApiResponse } from '../types';

const router = Router();

// All hedged trade routes require authentication
router.use(authMiddleware);

/**
 * POST /api/hedged-trades
 * Module 17: Execute coupled hedged trade
 */
router.post(
  '/',
  validateBody(createHedgedTradeSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await hedgedTradeService.execute(req.user!.userId, req.body);
      
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };
      
      res.status(201).json(response);
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * GET /api/hedged-trades
 * Get all hedged trades for current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const trades = await hedgedTradeService.getAllForUser(req.user!.userId);
    
    const response: ApiResponse<typeof trades> = {
      success: true,
      data: trades,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/hedged-trades/:id
 * Get hedged trade by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const trade = await hedgedTradeService.getById(req.params.id, req.user!.userId);
    
    const response: ApiResponse<typeof trade> = {
      success: true,
      data: trade,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

export default router;

