import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../db/client';
import { config } from '../config';
import { HealthStatus } from '../types';

const router = Router();

/**
 * GET /health
 * Module 18: Health / Diagnostics
 * 18.1: Provide version + DB connectivity check
 */
router.get('/', async (req: Request, res: Response) => {
  const dbCheck = await checkDatabaseHealth();
  
  const healthStatus: HealthStatus = {
    status: dbCheck.status === 'up' ? 'healthy' : 'unhealthy',
    version: config.version,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbCheck,
    },
  };
  
  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json({
    success: healthStatus.status === 'healthy',
    data: healthStatus,
  });
});

/**
 * GET /health/ready
 * Readiness check for k8s/load balancers
 */
router.get('/ready', async (req: Request, res: Response) => {
  const dbCheck = await checkDatabaseHealth();
  
  if (dbCheck.status === 'up') {
    res.status(200).json({ success: true, data: { ready: true } });
  } else {
    res.status(503).json({
      success: false,
      error: { code: 'NOT_READY', message: 'Service not ready' },
    });
  }
});

/**
 * GET /health/live
 * Liveness check
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { live: true } });
});

export default router;

