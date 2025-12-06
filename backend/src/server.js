import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import portfolioRoutes from './routes/portfolio.js';
import tradingRoutes from './routes/trading.js';
import quantRoutes from './routes/quant.js';
import llmRoutes from './routes/llm.js';
import newsRoutes from './routes/news.js';
import marketDataRoutes from './routes/marketData.js';
import paymentRoutes from './routes/payment.js';
import performanceRoutes from './routes/performance.js';
import { initializeDataLayer, unifiedDataLayer } from './data/unifiedDataLayer.js';
import { setupWebSocket } from './websocket/websocket.js';
import { requestLogger, errorLogger } from './middleware/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : '*'),
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Request/Response logging middleware
app.use(requestLogger);

// Initialize data layer (MongoDB or file-based)
await initializeDataLayer();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/quant', quantRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/market-data', marketDataRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/performance', performanceRoutes);

// Health check
app.get('/health', async (req, res) => {
  const dbStatus = unifiedDataLayer.getDatabaseStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

// Error handling middleware (must be last, after all routes)
app.use(errorLogger);

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.response?.status || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    error: message,
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const server = createServer(app);

// WebSocket setup
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 WebSocket server ready`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Production mode - CORS enabled for: ${process.env.CORS_ORIGIN || 'all origins'}`);
  }
});

