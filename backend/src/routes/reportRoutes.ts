import { Router, Request, Response } from 'express';
import { reportService } from '../services/reportService';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { createReportSchema } from '../utils/validators';
import { handleError } from '../utils/errors';
import { ApiResponse } from '../types';

const router = Router();

// All report routes require authentication
router.use(authMiddleware);

/**
 * POST /api/reports
 * Module 12: Generate report
 */
router.post(
  '/',
  validateBody(createReportSchema),
  async (req: Request, res: Response) => {
    try {
      const report = await reportService.generate(req.user!.userId, req.body);
      
      const response: ApiResponse<typeof report> = {
        success: true,
        data: report,
      };
      
      res.status(201).json(response);
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * GET /api/reports
 * Get all reports for current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const reports = await reportService.getAllForUser(req.user!.userId);
    
    const response: ApiResponse<typeof reports> = {
      success: true,
      data: reports,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/reports/:id
 * Get report by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const report = await reportService.getById(req.params.id, req.user!.userId);
    
    const response: ApiResponse<typeof report> = {
      success: true,
      data: report,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

export default router;

