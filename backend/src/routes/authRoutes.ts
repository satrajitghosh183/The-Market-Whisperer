import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { createUserSchema, loginSchema } from '../utils/validators';
import { handleError } from '../utils/errors';
import { ApiResponse } from '../types';

const router = Router();

/**
 * POST /api/auth/register
 * Module 1: User Registration
 */
router.post(
  '/register',
  validateBody(createUserSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await authService.register(req.body);
      
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
 * POST /api/auth/login
 * Module 2: User Login
 */
router.post(
  '/login',
  validateBody(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await authService.login(req.body);
      
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };
      
      res.status(200).json(response);
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * GET /api/auth/me
 * Module 3: Protected route - get current user profile
 */
router.get(
  '/me',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = await authService.getProfile(req.user!.userId);
      
      const response: ApiResponse<typeof user> = {
        success: true,
        data: user,
      };
      
      res.status(200).json(response);
    } catch (error) {
      handleError(res, error);
    }
  }
);

export default router;

