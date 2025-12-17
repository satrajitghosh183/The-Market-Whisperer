import { Router, Request, Response } from 'express';
import { walletService } from '../services/walletService';
import { ledgerService } from '../services/ledgerService';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { depositSchema } from '../utils/validators';
import { handleError } from '../utils/errors';
import { ApiResponse } from '../types';

const router = Router();

// All wallet routes require authentication
router.use(authMiddleware);

/**
 * GET /api/wallet
 * Get current user's wallet
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const wallet = await walletService.getByUserId(req.user!.userId);
    
    const response: ApiResponse<typeof wallet> = {
      success: true,
      data: wallet,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/wallet/deposit
 * Module 5: Wallet Funding (Deposit)
 */
router.post(
  '/deposit',
  validateBody(depositSchema),
  async (req: Request, res: Response) => {
    try {
      const wallet = await walletService.deposit(req.user!.userId, req.body);
      
      const response: ApiResponse<typeof wallet> = {
        success: true,
        data: wallet,
      };
      
      res.status(200).json(response);
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * GET /api/wallet/transactions
 * Get ledger transactions for current user
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const transactions = await ledgerService.getTransactionsForUser(req.user!.userId);
    
    const response: ApiResponse<typeof transactions> = {
      success: true,
      data: transactions,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/wallet/reconcile
 * Module 6.3: Verify wallet balance matches ledger history
 */
router.get('/reconcile', async (req: Request, res: Response) => {
  try {
    const reconciliation = await ledgerService.reconcileWalletBalance(req.user!.userId);
    
    const response: ApiResponse<typeof reconciliation> = {
      success: true,
      data: reconciliation,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

export default router;

