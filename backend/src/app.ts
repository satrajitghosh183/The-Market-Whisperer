import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { sendError, ErrorCodes } from './utils/errors';

// Import routes
import authRoutes from './routes/authRoutes';
import walletRoutes from './routes/walletRoutes';
import portfolioRoutes from './routes/portfolioRoutes';
import orderRoutes from './routes/orderRoutes';
import reportRoutes from './routes/reportRoutes';
import marketRoutes from './routes/marketRoutes';
import hedgedTradeRoutes from './routes/hedgedTradeRoutes';
import healthRoutes from './routes/healthRoutes';

export function createApp(): Express {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Module 20 (Optional): Rate Limiting
  // TODO: Implement more sophisticated per-user rate limiting
  if (config.nodeEnv !== 'test') {
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        success: false,
        error: {
          code: ErrorCodes.RATE_LIMIT_EXCEEDED,
          message: 'Too many requests, please try again later',
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    app.use(limiter);
  }
  
  // Health routes (no /api prefix)
  app.use('/health', healthRoutes);
  
  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/portfolios', portfolioRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/market', marketRoutes);
  app.use('/api/hedged-trades', hedgedTradeRoutes);
  
  // 404 handler
  app.use((req: Request, res: Response) => {
    sendError(res, 404, ErrorCodes.NOT_FOUND, `Route ${req.method} ${req.path} not found`);
  });
  
  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    sendError(res, 500, ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred');
  });
  
  return app;
}

