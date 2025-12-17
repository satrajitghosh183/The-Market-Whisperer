import { Router, Request, Response } from 'express';
import { orderService } from '../services/orderService';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { createOrderSchema } from '../utils/validators';
import { handleError } from '../utils/errors';
import { ApiResponse } from '../types';

const router = Router();

// All order routes require authentication
router.use(authMiddleware);

/**
 * POST /api/orders
 * Module 7: Order Placement
 */
router.post(
  '/',
  validateBody(createOrderSchema),
  async (req: Request, res: Response) => {
    try {
      const order = await orderService.create(req.user!.userId, req.body);
      
      const response: ApiResponse<typeof order> = {
        success: true,
        data: order,
      };
      
      res.status(201).json(response);
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * GET /api/orders
 * Get all orders for current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const orders = await orderService.getAllForUser(req.user!.userId);
    
    const response: ApiResponse<typeof orders> = {
      success: true,
      data: orders,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/orders/:id
 * Get order by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await orderService.getById(req.params.id, req.user!.userId);
    
    const response: ApiResponse<typeof order> = {
      success: true,
      data: order,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/orders/:id/settle
 * Module 8: Order Settlement
 */
router.post('/:id/settle', async (req: Request, res: Response) => {
  try {
    const order = await orderService.settle(req.params.id, req.user!.userId);
    
    const response: ApiResponse<typeof order> = {
      success: true,
      data: order,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/orders/:id/cancel
 * Cancel a pending order
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const order = await orderService.cancel(req.params.id, req.user!.userId);
    
    const response: ApiResponse<typeof order> = {
      success: true,
      data: order,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

export default router;

