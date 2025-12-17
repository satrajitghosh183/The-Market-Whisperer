import { Router, Request, Response } from 'express';
import { marketDataService } from '../services/marketDataService';
import { indicatorService } from '../services/indicatorService';
import { newsService } from '../services/newsService';
import { explainabilityService } from '../services/explainabilityService';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import {
  quoteRequestSchema,
  historyRequestSchema,
  computeIndicatorsSchema,
  ingestNewsSchema,
  explanationRequestSchema,
} from '../utils/validators';
import { handleError } from '../utils/errors';
import { ApiResponse } from '../types';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/market/quote/:ticker
 * Module 13: Get quote for a ticker
 */
router.get('/quote/:ticker', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const quote = await marketDataService.getQuote(req.params.ticker);
    
    const response: ApiResponse<typeof quote> = {
      success: true,
      data: quote,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/market/history/:ticker
 * Module 13: Get historical prices
 */
router.get('/history/:ticker', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const options = {
      startDate: req.query.start_date as string | undefined,
      endDate: req.query.end_date as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };
    
    const history = await marketDataService.getHistory(req.params.ticker, options);
    
    const response: ApiResponse<typeof history> = {
      success: true,
      data: history,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/market/indicators
 * Module 14: Compute technical indicators
 */
router.post(
  '/indicators',
  authMiddleware,
  validateBody(computeIndicatorsSchema),
  async (req: Request, res: Response) => {
    try {
      const indicators = await indicatorService.computeIndicators(
        req.body.ticker,
        req.body.window_size
      );
      
      const response: ApiResponse<typeof indicators> = {
        success: true,
        data: indicators,
      };
      
      res.status(200).json(response);
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * GET /api/market/indicators/:ticker
 * Get latest indicators for a ticker
 */
router.get('/indicators/:ticker', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const indicators = await indicatorService.getLatestIndicators(req.params.ticker);
    
    const response: ApiResponse<typeof indicators> = {
      success: true,
      data: indicators,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/market/news
 * Module 15: Ingest news article
 */
router.post(
  '/news',
  authMiddleware,
  validateBody(ingestNewsSchema),
  async (req: Request, res: Response) => {
    try {
      const article = await newsService.ingestArticle(req.body);
      
      const response: ApiResponse<typeof article> = {
        success: true,
        data: article,
      };
      
      res.status(201).json(response);
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * GET /api/market/news/:ticker
 * Get news articles for a ticker
 */
router.get('/news/:ticker', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      startDate: req.query.start_date as string | undefined,
      endDate: req.query.end_date as string | undefined,
    };
    
    const articles = await newsService.getArticles(req.params.ticker, options);
    
    const response: ApiResponse<typeof articles> = {
      success: true,
      data: articles,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/market/news/:ticker/sentiment
 * Get sentiment aggregate for a ticker
 */
router.get('/news/:ticker/sentiment', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const aggregate = await newsService.getDailyAggregate(req.params.ticker, date);
    
    const response: ApiResponse<typeof aggregate> = {
      success: true,
      data: aggregate,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/market/explain
 * Module 16: Get grounded explanation
 */
router.post(
  '/explain',
  authMiddleware,
  validateBody(explanationRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const explanation = await explainabilityService.getExplanation(req.body);
      
      const response: ApiResponse<typeof explanation> = {
        success: true,
        data: explanation,
      };
      
      res.status(200).json(response);
    } catch (error) {
      handleError(res, error);
    }
  }
);

export default router;

