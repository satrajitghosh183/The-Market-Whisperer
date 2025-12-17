# 🎯 Market Whisperer

A full-stack trading simulation web application with intelligent analytics, double-entry ledger accounting, and explainable AI insights.

## 📚 Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Module Overview](#module-overview)
- [Testing](#testing)
- [Error Handling](#error-handling)

## 🏗️ Architecture

```
market-whisperer/
├── backend/              # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/       # Configuration management
│   │   ├── db/           # Database client & schema
│   │   ├── middleware/   # Auth, validation, etc.
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic
│   │   ├── types/        # TypeScript types
│   │   ├── utils/        # Utilities & helpers
│   │   └── tests/        # API tests
│   └── package.json
├── frontend/             # Next.js + TypeScript UI
│   ├── src/
│   │   ├── app/          # Next.js App Router
│   │   └── lib/          # API client & utilities
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

### 1. Clone & Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `backend/src/db/schema.sql`
3. Get your API keys from **Settings > API**

### 3. Configure Environment Variables

Create `backend/.env`:

```env
# Backend Server
PORT=3001
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=86400

# Market Data Provider (use 'mock' for development)
MARKET_DATA_PROVIDER=mock
MARKET_DATA_CACHE_TTL=300

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# App Version
APP_VERSION=1.0.0
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:3000
- Health Check: http://localhost:3001/health

## 🗄️ Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with hashed passwords |
| `wallets` | One wallet per user with cash balance |
| `ledger_transactions` | Transaction headers for double-entry |
| `ledger_entries` | Individual debit/credit postings |
| `portfolios` | Named portfolios owned by users |
| `positions` | Holdings with VWAP cost tracking |
| `orders` | Buy/sell orders with status lifecycle |
| `hedged_trades` | Coupled two-leg trades |
| `reports` | Generated report artifacts |

### Analytics Tables

| Table | Description |
|-------|-------------|
| `market_prices_cache` | Cached market quotes |
| `indicator_features` | Computed technical indicators |
| `news_articles` | Ingested news with sentiment |
| `news_daily_aggregates` | Daily sentiment summaries |

## 📡 API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login and get JWT |
| `/api/auth/me` | GET | Get current user profile |

### Wallet

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wallet` | GET | Get user wallet |
| `/api/wallet/deposit` | POST | Deposit funds (idempotent) |
| `/api/wallet/transactions` | GET | Get ledger transactions |
| `/api/wallet/reconcile` | GET | Verify ledger reconciliation |

### Portfolios

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/portfolios` | GET | List all portfolios |
| `/api/portfolios` | POST | Create portfolio |
| `/api/portfolios/:id` | GET | Get portfolio |
| `/api/portfolios/:id/valuation` | GET | Get valuation with P&L |
| `/api/portfolios/:id/positions` | GET | Get positions |

### Orders

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orders` | GET | List all orders |
| `/api/orders` | POST | Create order |
| `/api/orders/:id` | GET | Get order |
| `/api/orders/:id/settle` | POST | Settle pending order |
| `/api/orders/:id/cancel` | POST | Cancel pending order |

### Market Data

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/market/quote/:ticker` | GET | Get quote |
| `/api/market/history/:ticker` | GET | Get historical prices |
| `/api/market/indicators` | POST | Compute indicators |
| `/api/market/news` | POST | Ingest news article |
| `/api/market/news/:ticker` | GET | Get news for ticker |
| `/api/market/explain` | POST | Get AI explanation |

### Reports

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reports` | GET | List reports |
| `/api/reports` | POST | Generate report |
| `/api/reports/:id` | GET | Get report |

### Hedged Trades

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/hedged-trades` | GET | List hedged trades |
| `/api/hedged-trades` | POST | Execute hedged trade |
| `/api/hedged-trades/:id` | GET | Get hedged trade |

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health status with DB check |
| `/health/live` | GET | Liveness probe |
| `/health/ready` | GET | Readiness probe |

## 📦 Module Overview

| # | Module | Description |
|---|--------|-------------|
| 1 | User Registration | Secure password hashing, duplicate rejection |
| 2 | User Login | JWT-based authentication |
| 3 | Auth Guard | Protected routes, ownership verification |
| 4 | Wallet Provisioning | One wallet per user, auto-created |
| 5 | Wallet Funding | Idempotent deposits, NUMERIC precision |
| 6 | Double-Entry Ledger | Balanced debit/credit postings |
| 7 | Order Placement | Schema validation, status lifecycle |
| 8 | Order Settlement | Atomic multi-table updates |
| 9 | Positions (VWAP) | Volume-weighted average cost tracking |
| 10 | Portfolio Management | Create/retrieve with stable IDs |
| 11 | Portfolio Valuation | Market value & unrealized P&L |
| 12 | Reports Generation | Reproducible with persisted params |
| 13 | Market Data | Provider adapter with caching |
| 14 | Quant Analytics | SMA, EMA, RSI, MACD, composite score |
| 15 | News + Sentiment | Article ingestion with sentiment scoring |
| 16 | Explainability | Grounded explanations from stored data |
| 17 | Hedged Trades | Atomic two-leg trades with diagnostics |
| 18 | Health Checks | Version + DB connectivity |
| 19 | WebSocket (TODO) | Real-time updates placeholder |
| 20 | Rate Limiting | Basic rate limiting implemented |

## 🧪 Testing

```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

Tests cover all 18 required modules with integration tests using Supertest.

## ⚠️ Error Handling

All API errors follow a consistent envelope:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing/invalid auth |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INSUFFICIENT_FUNDS` | 422 | Not enough cash |
| `INSUFFICIENT_SHARES` | 422 | Not enough shares |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected error |

## 📝 License

MIT

---

Built with ❤️ for the Programming Finance course.

