# Market Whisperer - News and Policy-Aware Trading Platform

A comprehensive trading simulation platform that integrates quantitative analysis, sentiment processing, and policy awareness with an explainable AI language model. Built with Node.js, Next.js, MongoDB, and Python.

## Features

### Core Functionality

- **User Management & Authentication**
  - Secure user registration and login with bcrypt password hashing
  - MongoDB integration with file-based fallback
  - Multiple user roles: Investor, Trader, and Auto-Trader
  - User profiles with risk profiles and investment horizons
  - Automatic wallet creation with initial balance ($10,000 default)

- **Portfolio Management**
  - Automated portfolio generation using quantitative analysis
  - Multi-stock portfolio optimization
  - Real-time portfolio valuation and P&L tracking
  - Portfolio rebalancing recommendations
  - Position tracking with average cost basis
  - **Live portfolio updates** with real-time price data

- **Trading Operations**
  - Market and limit orders
  - Buy and sell order execution with live prices
  - Real-time stock prices from Twelve Data API
  - Coupled (hedged) trades for market-neutral positions
  - Order basket aggregation
  - Order cancellation for pending orders
  - Real-time order status updates

- **Payment System**
  - Fake Stripe payment integration for adding funds
  - Secure wallet deposits
  - Payment history tracking
  - Test card support for development

- **Paper Trading Performance**
  - Robinhood-style performance dashboard
  - Real-time profit/loss tracking
  - Interactive portfolio performance charts
  - Historical performance data
  - Daily and total P&L metrics

- **Quantitative Analysis**
  - Technical indicator calculation (RSI, moving averages, momentum, ATR)
  - Composite scoring system
  - Stock recommendation engine (Long/Short/Neutral)
  - Historical data analysis
  - Portfolio recommendation generation
  - Live stock data from Twelve Data API

- **AI-Powered Explanations**
  - Natural language explanations of trading decisions
  - Strategy generation based on market conditions
  - Portfolio allocation explanations
  - Hugging Face API integration
  - Fallback template-based explanations when API unavailable

- **News & Sentiment Analysis**
  - Real-time news fetching from NewsAPI
  - Sentiment analysis for stock-related news
  - News filtering by ticker
  - Sentiment scoring and visualization

- **Real-Time Updates**
  - WebSocket-based live portfolio updates
  - Real-time position value tracking
  - Live ticker price subscriptions
  - Automatic portfolio mark-to-market
  - Price updates every 5 seconds

- **Data Visualization**
  - Interactive stock charts (Recharts)
  - Portfolio performance graphs
  - Position breakdown visualizations
  - Account summary dashboards
  - Robinhood-style performance charts

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas (with file-based fallback)
- **Real-Time**: WebSocket (ws)
- **APIs**: Twelve Data (stock prices), NewsAPI (news), Hugging Face (AI)
- **Visualization**: Recharts, Plotly.js
- **Deployment**: Vercel (frontend), Render (backend)

## Project Structure

```
The-Market-Whisperer/
├── backend/                    # Node.js/Express backend API
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   │   ├── auth.js        # Authentication endpoints
│   │   │   ├── trading.js     # Trading endpoints
│   │   │   ├── portfolio.js   # Portfolio endpoints
│   │   │   ├── quant.js       # Quantitative analysis endpoints
│   │   │   ├── llm.js         # LLM explanation endpoints
│   │   │   ├── news.js        # News endpoints
│   │   │   ├── marketData.js  # Market data endpoints
│   │   │   ├── payment.js     # Payment endpoints
│   │   │   └── performance.js # Performance tracking endpoints
│   │   ├── services/          # Business logic services
│   │   │   ├── tradingService.js      # Order execution logic
│   │   │   ├── portfolioManager.js    # Portfolio calculations
│   │   │   ├── portfolioPerformanceService.js # Performance tracking
│   │   │   ├── basketManager.js       # Order basket management
│   │   │   ├── quantService.js        # Quantitative analysis
│   │   │   ├── llmService.js          # AI explanations
│   │   │   ├── newsService.js         # News fetching
│   │   │   ├── twelveDataService.js   # Stock data API
│   │   │   └── paymentService.js      # Payment processing
│   │   ├── data/              # Data access layer
│   │   │   ├── dataLayer.js   # File-based storage
│   │   │   ├── mongoDataLayer.js # MongoDB storage
│   │   │   └── unifiedDataLayer.js # Unified interface
│   │   ├── database/          # MongoDB models
│   │   │   ├── connection.js  # MongoDB connection
│   │   │   └── models/        # Mongoose schemas
│   │   ├── websocket/         # WebSocket server
│   │   │   └── websocket.js   # Real-time updates
│   │   ├── middleware/        # Express middleware
│   │   │   ├── logger.js      # Request logging
│   │   │   └── validator.js   # Input validation
│   │   ├── utils/             # Utility functions
│   │   │   ├── cache.js       # Caching utilities
│   │   │   ├── rateLimiter.js # Rate limiting
│   │   │   └── retry.js       # Retry logic
│   │   └── server.js          # Express server setup
│   ├── scripts/               # Utility scripts
│   │   ├── migrate-to-mongodb.js # Data migration
│   │   └── verify-setup.js    # Setup verification
│   ├── render.yaml            # Render deployment config
│   ├── Procfile               # Process file
│   └── package.json
├── frontend/                  # Next.js frontend
│   ├── src/
│   │   ├── app/               # Next.js app directory
│   │   │   ├── page.tsx       # Main dashboard
│   │   │   ├── layout.tsx     # App layout
│   │   │   └── globals.css    # Global styles
│   │   ├── components/        # React components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── TradingView.tsx
│   │   │   ├── PortfolioView.tsx
│   │   │   ├── PortfolioPerformance.tsx # Performance dashboard
│   │   │   ├── QuantAnalysis.tsx
│   │   │   ├── QuantTradingPanel.tsx
│   │   │   ├── NewsSentimentView.tsx
│   │   │   ├── AddFunds.tsx   # Payment component
│   │   │   ├── AccountSummary.tsx
│   │   │   ├── StockChart.tsx
│   │   │   └── PortfolioChart.tsx
│   │   └── contexts/          # React contexts
│   │       └── AuthContext.tsx
│   ├── vercel.json            # Vercel deployment config
│   └── package.json
├── quant-engine/              # Python quantitative engine
│   ├── src/
│   │   ├── __init__.py
│   │   └── analyze.py         # Feature extraction and scoring
│   └── requirements.txt
├── data/                      # Local stock data files
│   └── *.txt                  # OHLCV data files (CSV format)
├── vercel.json                # Root Vercel config
└── README.md
```

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **Python** 3.8+ and pip (optional, for quant engine)
- **Git** (for cloning the repository)
- **MongoDB Atlas account** (free tier) or use file-based storage

## Installation

### Step 1: Clone the Repository

```bash
git clone git@github.com:satrajitghosh183/The-Market-Whisperer.git
cd The-Market-Whisperer
```

### Step 2: Install Dependencies

**Backend dependencies:**
```bash
cd backend
npm install
```

**Frontend dependencies:**
```bash
cd frontend
npm install
```

**Python dependencies (optional):**
```bash
cd quant-engine
pip install -r requirements.txt
```

### Step 3: Environment Setup

Create a `.env` file in the `backend/` directory:

```env
# MongoDB Configuration
MONGODB_URI=
USE_MONGODB=true

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# API Keys - Required
NEWS_API_KEY=your_newsapi_key_here
TWELVE_DATA_API_KEY=your_twelvedata_key_here

# API Keys - Optional (for AI features)
HUGGINGFACE_API_KEY=your_huggingface_key_here
HUGGINGFACE_INFERENCE_API_KEY=your_inference_key_here
USE_HUGGINGFACE_INFERENCE_API=false
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

**Get API Keys:**
- **News API**: https://newsapi.org/register
- **Twelve Data**: https://twelvedata.com/account/api-keys
- **Hugging Face**: https://huggingface.co/settings/tokens

### Step 4: Verify Setup

```bash
cd backend
npm run verify
```

This will verify:
- MongoDB connection
- API keys configuration
- Trading functions
- All services

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

This will start:
- **Backend API** on `http://localhost:3001`
- **Frontend** on `http://localhost:3000`
- **WebSocket Server** on `ws://localhost:3001/ws`

### Production Mode

**Build frontend:**
```bash
cd frontend
npm run build
npm start
```

**Start backend:**
```bash
cd backend
npm start
```

## Deployment

The application is configured for deployment to:
- **Frontend**: Vercel (free tier)
- **Backend**: Render (free tier)

See `DEPLOYMENT.md` for complete deployment instructions.

**Quick Deploy:**
1. Push code to GitHub
2. Deploy backend to Render (see `backend/render.yaml`)
3. Deploy frontend to Vercel (see `frontend/vercel.json`)
4. Set environment variables in both platforms
5. Update CORS_ORIGIN in Render with Vercel URL

## Usage Guide

### 1. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

### 2. Create an Account

1. Click "Register"
2. Enter your email and password
3. Select your role (Investor, Trader, or Auto-Trader)
4. Click "Register"

**Note:** New users automatically receive:
- A wallet with $10,000 initial balance
- A default portfolio

### 3. Add Funds (Optional)

1. Navigate to **"Add Funds"** tab
2. Enter deposit amount
3. Use test card: `4242 4242 4242 4242`
4. Complete payment
5. Funds added to wallet instantly

### 4. View Performance

1. Navigate to **"Performance"** tab (default view)
2. View real-time portfolio value
3. See today's change and total P&L
4. Interactive performance chart
5. Select time range (1D, 1W, 1M, 3M, 1Y, ALL)

### 5. Generate a Portfolio

1. Navigate to the **Portfolio** tab
2. Click "Generate Portfolio"
3. Optionally specify number of stocks and benchmark
4. System generates optimized portfolio

### 6. Place Trades

1. Navigate to the **Trading** tab
2. Select ticker, quantity, and side (Buy/Sell)
3. Click "Place Order"
4. Order executes with live prices from Twelve Data API
5. Position updates automatically

### 7. Monitor Portfolio

1. Go to **Portfolio** tab
2. View positions with real-time prices
3. See unrealized P&L
4. Portfolio auto-updates every 10 seconds
5. WebSocket provides real-time price updates

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/profile/:userId` | Get user profile |

### Portfolio

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portfolio/user/:userId` | Get user portfolios (with live prices) |
| GET | `/api/portfolio/:portfolioId` | Get portfolio details |
| POST | `/api/portfolio/generate` | Generate optimized portfolio |
| POST | `/api/portfolio/:portfolioId/rebalance` | Get rebalancing instructions |

### Trading

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/trading/order` | Place order (uses live prices) |
| GET | `/api/trading/orders/:userId` | Get user orders |
| POST | `/api/trading/order/:orderId/cancel` | Cancel order |
| POST | `/api/trading/order/:orderId/execute` | Execute pending order |
| POST | `/api/trading/coupled` | Execute coupled trade |

### Market Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/market-data/quote/:ticker` | Get real-time quote |
| GET | `/api/market-data/timeseries/:ticker` | Get time series data |
| GET | `/api/market-data/historical/:ticker` | Get historical data |

### News

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/news/ticker/:ticker` | Get news for ticker |
| GET | `/api/news/ticker/:ticker/sentiment` | Get news with sentiment |
| GET | `/api/news/business` | Get business news |

### Payment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/create-intent` | Create payment intent |
| POST | `/api/payment/confirm` | Confirm and process payment |
| GET | `/api/payment/wallet/:userId` | Get wallet balance |
| GET | `/api/payment/history/:userId` | Get payment history |
| GET | `/api/payment/test-cards` | Get test card numbers |

### Performance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/performance/current/:portfolioId` | Get current performance |
| GET | `/api/performance/history/:portfolioId` | Get performance history |
| POST | `/api/performance/snapshot` | Create portfolio snapshot |

### Quantitative Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quant/analysis/:ticker` | Get quant analysis for ticker |
| GET | `/api/quant/tickers` | Get available tickers |
| GET | `/api/quant/data/:ticker` | Get stock price data |

### LLM Explanations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/llm/explain` | Generate explanation for analysis |
| POST | `/api/llm/strategy` | Generate trading strategy |

## WebSocket Events

Connect to `ws://localhost:3001/ws` for real-time updates.

### Client → Server

**Subscribe to Portfolio:**
```json
{
  "type": "subscribe_portfolio",
  "payload": {
    "portfolioId": "portfolio_123",
    "userId": "user_123"
  }
}
```

**Subscribe to Ticker:**
```json
{
  "type": "subscribe_ticker",
  "payload": {
    "ticker": "AAPL"
  }
}
```

### Server → Client

**Portfolio Update:**
```json
{
  "type": "portfolio_update",
  "portfolio": {
    "portfolioId": "portfolio_123",
    "positions": [...],
    "totalValue": 15000,
    "unrealizedPnL": 500
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Ticker Update:**
```json
{
  "type": "ticker_update",
  "ticker": "AAPL",
  "price": 150.00,
  "change": 2.5,
  "percent_change": 1.67,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Data Storage

The application uses **MongoDB Atlas** (primary) with **file-based storage** (fallback).

### MongoDB Collections

- `users` - User accounts
- `wallets` - User wallets and balances
- `portfolios` - Portfolio configurations
- `positions` - Stock positions
- `orders` - Trading orders
- `ledger` - Transaction ledger
- `baskets` - Order baskets

### File-Based Fallback

If MongoDB is unavailable, data is stored in:
```
backend/src/storage/
├── users.json
├── wallets.json
├── portfolios.json
├── positions.json
├── orders.json
├── ledger.json
└── baskets.json
```

## Testing

Run the verification script to test all functionality:

```bash
cd backend
npm run verify
```

This tests:
- MongoDB connection
- Twelve Data API
- Trading functions
- News API
- WebSocket

## Troubleshooting

### Port Already in Use

**Windows:**
```powershell
netstat -ano | findstr :3001
taskkill /F /PID <PID>
```

**Mac/Linux:**
```bash
lsof -ti:3001 | xargs kill -9
```

### MongoDB Connection Failed

- Check `MONGODB_URI` in `.env`
- Verify MongoDB Atlas network access (allow `0.0.0.0/0`)
- Check password is correct
- Application will fallback to file storage

### API Keys Not Working

- Verify API keys in `.env` file
- Check rate limits
- Review API service status
- Application will use fallback/cached data when possible

### Performance Tab Loading

- Ensure portfolio exists
- Check backend logs
- Verify MongoDB connection
- Component will show helpful error messages

## Security Notes

- Passwords hashed with bcrypt
- MongoDB connection string secured
- API keys stored in environment variables
- CORS configured for production
- Input validation on all routes
- Rate limiting implemented

## License

MIT License

## Authors

**Trading Platform Team**
- Satrajit Ghosh
- Team Members

**Course:** Programming Finance  
**Institution:** Rutgers University  
**Date:** December 2025

## Acknowledgments

- Built with Express.js, Next.js, MongoDB, and Python
- Uses Recharts and Plotly.js for data visualization
- Twelve Data API for real-time stock prices
- NewsAPI for news and sentiment
- Hugging Face API for AI explanations (optional)
- Vercel and Render for deployment

---

**Happy Trading! 📈**
