# Market Whisperer - News and Policy-Aware Trading Platform

A comprehensive trading simulation platform that integrates quantitative analysis, sentiment processing, and policy awareness with an explainable AI language model. Built with Node.js, Next.js, and Python.

## Features

### Core Functionality

- **User Management & Authentication**
  - Secure user registration and login with bcrypt password hashing
  - Multiple user roles: Investor, Trader, and Auto-Trader
  - User profiles with risk profiles and investment horizons
  - Automatic wallet creation with initial balance ($10,000 default)

- **Portfolio Management**
  - Automated portfolio generation using quantitative analysis
  - Multi-stock portfolio optimization
  - Real-time portfolio valuation and P&L tracking
  - Portfolio rebalancing recommendations
  - Position tracking with average cost basis

- **Trading Operations**
  - Market and limit orders
  - Buy and sell order execution
  - Coupled (hedged) trades for market-neutral positions
  - Order basket aggregation (5-second window)
  - Order cancellation for pending orders
  - Real-time order status updates

- **Quantitative Analysis**
  - Technical indicator calculation (RSI, moving averages, momentum, ATR)
  - Composite scoring system
  - Stock recommendation engine (Long/Short/Neutral)
  - Historical data analysis
  - Portfolio recommendation generation

- **AI-Powered Explanations**
  - Natural language explanations of trading decisions
  - Strategy generation based on market conditions
  - Portfolio allocation explanations
  - Fallback template-based explanations when API unavailable

- **Real-Time Updates**
  - WebSocket-based live portfolio updates
  - Real-time position value tracking
  - Live ticker price subscriptions
  - Automatic portfolio mark-to-market

- **Data Visualization**
  - Interactive stock charts
  - Portfolio performance graphs
  - Position breakdown visualizations
  - Account summary dashboards

## Project Structure


The-Market-Whisperer/
├── backend/                    # Node.js/Express backend API
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   │   ├── auth.js        # Authentication endpoints
│   │   │   ├── trading.js     # Trading endpoints
│   │   │   ├── portfolio.js   # Portfolio endpoints
│   │   │   ├── quant.js       # Quantitative analysis endpoints
│   │   │   └── llm.js         # LLM explanation endpoints
│   │   ├── services/          # Business logic services
│   │   │   ├── tradingService.js      # Order execution logic
│   │   │   ├── portfolioManager.js    # Portfolio calculations
│   │   │   ├── basketManager.js       # Order basket management
│   │   │   ├── quantService.js        # Quantitative analysis
│   │   │   └── llmService.js          # AI explanations
│   │   ├── data/              # Data access layer
│   │   │   └── dataLayer.js   # File-based storage operations
│   │   ├── websocket/         # WebSocket server
│   │   │   └── websocket.js   # Real-time updates
│   │   ├── storage/           # JSON file storage
│   │   │   ├── users.json
│   │   │   ├── portfolios.json
│   │   │   ├── positions.json
│   │   │   ├── orders.json
│   │   │   ├── wallets.json
│   │   │   ├── ledger.json
│   │   │   └── baskets.json
│   │   └── server.js          # Express server setup
│   ├── spec/                  # Jasmine test suite
│   │   ├── data/              # Data layer tests
│   │   ├── services/          # Service tests
│   │   ├── routes/            # Route tests
│   │   ├── websocket/         # WebSocket tests
│   │   └── helpers/           # Test utilities
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
│   │   │   ├── QuantAnalysis.tsx
│   │   │   ├── AccountSummary.tsx
│   │   │   ├── StockChart.tsx
│   │   │   └── PortfolioChart.tsx
│   │   └── contexts/          # React contexts
│   │       └── AuthContext.tsx
│   └── package.json
├── quant-engine/              # Python quantitative engine
│   ├── src/
│   │   ├── __init__.py
│   │   └── analyze.py         # Feature extraction and scoring
│   └── requirements.txt
├── data/                      # Local stock data files
│   └── *.txt                  # OHLCV data files (CSV format)
└── README.md


## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **Python** 3.8+ and pip
- **Git** (for cloning the repository)

## Installation

### Step 1: Clone the Repository

bash
git clone <repository-url>
cd The-Market-Whisperer


### Step 2: Install All Dependencies

You can install all dependencies at once using the convenience script:

bash
npm run install:all


Or install them manually:

**Root dependencies:**
bash
npm install


**Backend dependencies:**
bash
cd backend
npm install
cd ..


**Frontend dependencies:**
bash
cd frontend
npm install
cd ..


**Python dependencies:**
bash
cd quant-engine
pip install -r requirements.txt
cd ..


### Step 3: Environment Setup (Optional)

Create a `.env` file in the `backend/` directory for optional configuration:

env
PORT=3001
HUGGINGFACE_API_KEY=your_api_key_here
HUGGINGFACE_API_URL=https://api-inference.huggingface.co/models


**Note:** The application works without the Hugging Face API key, but will use template-based explanations instead of AI-generated ones.

### Step 4: Stock Data Setup

Ensure you have stock data files in the `data/` directory. The application expects CSV files with the following format:

- Filename: `{TICKER}.us.txt` or `{TICKER}.txt`
- Format: CSV with columns: ticker, period, date, time, open, high, low, close, volume, openint

Example files are already included in the `data/` directory.

## Running the Application

### Development Mode (Recommended)

Run both backend and frontend concurrently:

bash
npm run dev


This will start:
- **Backend API** on `http://localhost:3001`
- **Frontend** on `http://localhost:3000`
- **WebSocket Server** on `ws://localhost:3001/ws`

### Run Services Individually

**Backend only:**
bash
npm run dev:backend
# or
cd backend
npm run dev


**Frontend only:**
bash
npm run dev:frontend
# or
cd frontend
npm run dev


### Production Mode

**Build frontend:**
bash
cd frontend
npm run build
npm start


**Start backend:**
bash
cd backend
npm start


## Running Tests

The project includes a comprehensive Jasmine test suite covering all backend functionality.

### Run All Tests

bash
cd backend
npm test


### Run Tests in Watch Mode

bash
cd backend
npm run test:watch


### Run Specific Test File

bash
cd backend
npx jasmine spec/data/dataLayer.spec.js


### Test Coverage

The test suite includes:
- Data layer CRUD operations
- Service business logic
- API route handlers
- WebSocket functionality
- Error handling and edge cases

See the [Test Documentation](#testing) section below for details.

## Usage Guide

### 1. Access the Application

Open your browser and navigate to:

http://localhost:3000


### 2. Create an Account

1. Click "Register" or navigate to the registration page
2. Enter your email and password
3. Select your role:
   - **Investor**: Long-term investment focus
   - **Trader**: Active trading with manual control
   - **Auto-Trader**: Automated trading strategies
4. Set your risk profile (conservative, moderate, aggressive)
5. Set investment horizon (years)
6. Click "Register"

**Note:** New users automatically receive:
- A wallet with $10,000 initial balance
- A default portfolio

### 3. Generate a Portfolio

1. Navigate to the **Portfolio** tab
2. Click "Generate Portfolio"
3. Optionally specify:
   - Number of stocks (default: 20)
   - Benchmark (default: SPY)
4. The system will:
   - Analyze available stocks
   - Generate optimized portfolio recommendations
   - Create or update your portfolio with target weights

### 4. Analyze Stocks

1. Go to the **Analysis** tab
2. Enter a ticker symbol (e.g., AAPL, GOOGL)
3. View:
   - Quantitative analysis scores
   - Technical indicators (RSI, momentum, etc.)
   - Trading recommendations (Long/Short/Neutral)
   - AI-generated explanations
   - Historical price charts

### 5. Place Trades

1. Navigate to the **Trading** tab
2. **Place a Market Order:**
   - Select ticker
   - Choose side (Buy/Sell)
   - Enter quantity
   - Click "Place Order"

3. **Place a Limit Order:**
   - Select ticker
   - Choose side (Buy/Sell)
   - Enter quantity
   - Enter limit price
   - Select "Limit" order type
   - Click "Place Order"

4. **Execute Coupled Trade:**
   - Enter long ticker and quantity
   - Enter short ticker and quantity
   - Click "Execute Coupled Trade"
   - Creates a market-neutral hedged position

### 6. Monitor Your Account

1. Go to the **Account** tab
2. View:
   - Wallet balance (available and locked)
   - Current positions
   - Unrealized P&L
   - Order history
   - Transaction ledger

### 7. Rebalance Portfolio

1. Navigate to **Portfolio** tab
2. Click "Rebalance Portfolio"
3. View rebalancing instructions:
   - Which stocks to buy/sell
   - Target weight adjustments
   - Value changes needed

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/profile/:userId` | Get user profile |

**Register Request:**
json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "investor",
  "riskProfile": "moderate",
  "horizonYears": 2
}


### Portfolio

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portfolio/user/:userId` | Get user portfolios |
| GET | `/api/portfolio/:portfolioId` | Get portfolio details |
| POST | `/api/portfolio/generate` | Generate optimized portfolio |
| POST | `/api/portfolio/:portfolioId/rebalance` | Get rebalancing instructions |

**Generate Portfolio Request:**

{
  "userId": "user_123",
  "numStocks": 20,
  "benchmark": "SPY"
}


### Trading

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/trading/order` | Place order |
| GET | `/api/trading/orders/:userId` | Get user orders |
| POST | `/api/trading/order/:orderId/cancel` | Cancel order |
| POST | `/api/trading/coupled` | Execute coupled trade |
| GET | `/api/trading/basket/:symbol` | Get basket status |

**Place Order Request:**

{
  "userId": "user_123",
  "ticker": "AAPL",
  "quantity": 10,
  "side": "buy",
  "orderType": "market"
}


### Quantitative Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quant/analysis/:ticker` | Get quant analysis for ticker |
| GET | `/api/quant/tickers` | Get available tickers |
| GET | `/api/quant/data/:ticker` | Get stock price data |
| GET | `/api/quant/data/:ticker?limit=100` | Get limited stock data |

### LLM Explanations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/llm/explain` | Generate explanation for analysis |
| POST | `/api/llm/strategy` | Generate trading strategy |

**Explain Request:**

{
  "ticker": "AAPL",
  "analysis": {
    "score": 75,
    "recommendation": "long"
  },
  "indicators": {
    "rsi": 60,
    "momentum60": 0.05
  }
}


## WebSocket Events

Connect to `ws://localhost:3001/ws` for real-time updates.

### Client → Server

**Subscribe to Portfolio:**

{
  "type": "subscribe_portfolio",
  "payload": {
    "portfolioId": "portfolio_123",
    "userId": "user_123"
  }
}


**Subscribe to Ticker:**

{
  "type": "subscribe_ticker",
  "payload": {
    "ticker": "AAPL"
  }
}


### Server → Client

**Connection Confirmation:**

{
  "type": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}


**Portfolio Update:**

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


**Ticker Update:**

{
  "type": "ticker_update",
  "ticker": "AAPL",
  "price": 150.00,
  "timestamp": "2024-01-01T00:00:00.000Z"
}


## Data Storage

The application uses **file-based storage** (JSON files) instead of a traditional database. All data is stored in:


backend/src/storage/
├── users.json          # User accounts
├── wallets.json        # User wallets and balances
├── portfolios.json     # Portfolio configurations
├── positions.json      # Stock positions
├── orders.json         # Trading orders
├── ledger.json         # Transaction ledger
└── baskets.json        # Order baskets


**Benefits:**
- No database setup required
- Data persists between restarts
- Easy to inspect and debug
- Simple backup (copy files)

**Note:** For production use, consider migrating to a proper database (PostgreSQL, MongoDB, etc.).

## Quantitative Engine

The Python quantitative engine (`quant-engine/src/analyze.py`) provides:

- **Technical Indicators:**
  - RSI (Relative Strength Index)
  - Moving Averages (SMA, EMA)
  - Momentum indicators
  - ATR (Average True Range)
  - Price deviations

- **Composite Scoring:**
  - Combines multiple technical indicators
  - Sentiment integration (when available)
  - Policy awareness factors
  - Generates Long/Short/Neutral recommendations

- **Portfolio Optimization:**
  - Multi-stock analysis
  - Risk-adjusted scoring
  - Diversification recommendations

The engine is called via Python subprocess from Node.js and returns JSON analysis results.

## Testing

The project includes comprehensive Jasmine tests for all backend functionality.

### Test Structure


backend/spec/
├── data/              # Data layer tests
├── services/          # Service tests
├── routes/            # API route tests
├── websocket/         # WebSocket tests
└── helpers/           # Test utilities


### Running Tests

bash
cd backend
npm test              # Run all tests
npm run test:watch    # Watch mode


### Test Coverage

- **Data Layer**: All CRUD operations for users, wallets, portfolios, positions, orders, ledger, baskets
- **Services**: Trading, portfolio management, basket management, quant analysis, LLM services
- **Routes**: All API endpoints with request/response validation
- **WebSocket**: Connection handling, subscriptions, broadcasting
- **Error Handling**: Edge cases and error scenarios

## Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:**
bash
# Find and kill process on port 3001
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3001 | xargs kill -9


### Python Not Found

**Error:** `'python' is not recognized` or `python: command not found`

**Solution:**
- Ensure Python 3.8+ is installed
- Add Python to your PATH
- On Windows, try `python3` instead of `python`
- Verify: `python --version` or `python3 --version`

### Missing Stock Data

**Error:** `No data available for ticker`

**Solution:**
- Ensure stock data files exist in `data/` directory
- Check file naming: `{TICKER}.us.txt` or `{TICKER}.txt`
- Verify CSV format matches expected structure
- Check available tickers: `GET /api/quant/tickers`

### Module Import Errors

**Error:** `Cannot find module` or `ERR_MODULE_NOT_FOUND`

**Solution:**
bash
# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install


### WebSocket Connection Failed

**Error:** WebSocket connection errors

**Solution:**
- Ensure backend is running on port 3001
- Check WebSocket path: `ws://localhost:3001/ws`
- Verify firewall settings
- Check browser console for detailed errors

### Tests Failing

**Error:** Test failures

**Solution:**
- Ensure all dependencies are installed: `npm install`
- Check that stock data files exist in `data/` directory
- Verify Python dependencies: `pip install -r quant-engine/requirements.txt`
- Run tests from `backend/` directory

## Security Notes

- Passwords are hashed using bcrypt
- File-based storage is not encrypted (consider encryption for production)
- No authentication middleware currently (add JWT validation for production)
- API endpoints are not rate-limited (add rate limiting for production)
- CORS is enabled for all origins (restrict in production)

## Future Enhancements

- [ ] Database migration (PostgreSQL/MongoDB)
- [ ] JWT authentication middleware
- [ ] Rate limiting
- [ ] Real-time market data integration
- [ ] Advanced charting features
- [ ] Paper trading mode
- [ ] Backtesting capabilities
- [ ] Multi-currency support
- [ ] Mobile responsive design improvements
- [ ] Docker containerization

## License

MIT License

## Authors

**Trading Platform Team**
- Matthew Kubiak
- Satrajit Ghosh
- Lin Xia
- Kalyan Cheruvu

**Course:** Programming Finance  
**Professor:** Ivan Marsic  
**Institution:** Rutgers University  
**Date:** October 2025

## Acknowledgments

- Built with Express.js, Next.js, and Python
- Uses Recharts and Plotly.js for data visualization
- Hugging Face API for AI explanations (optional)
- Jasmine for comprehensive testing

---

**Happy Trading!**
