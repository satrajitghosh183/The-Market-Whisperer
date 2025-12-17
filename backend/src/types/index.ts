// ============================================
// COMMON TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T = unknown> = ApiResponse<T> | ApiError;

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  display_name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

// ============================================
// WALLET TYPES
// ============================================

export interface Wallet {
  id: string;
  user_id: string;
  cash_balance: string; // NUMERIC as string for precision
  created_at: string;
  updated_at: string;
}

export interface DepositInput {
  amount: number;
  idempotency_key: string;
}

// ============================================
// LEDGER TYPES
// ============================================

export type TxType = 'DEPOSIT' | 'WITHDRAWAL' | 'BUY' | 'SELL' | 'HEDGE_BUY' | 'HEDGE_SELL';

export interface LedgerTransaction {
  id: string;
  user_id: string;
  tx_type: TxType;
  reference_id: string | null;
  idempotency_key: string | null;
  description: string | null;
  created_at: string;
}

export type AccountType = 'CASH' | 'STOCK' | 'EQUITY' | 'REALIZED_PNL';

export interface LedgerEntry {
  id: string;
  tx_id: string;
  account_type: AccountType;
  account_ref: string | null;
  debit: string;
  credit: string;
  created_at: string;
}

// ============================================
// PORTFOLIO TYPES
// ============================================

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePortfolioInput {
  name: string;
  description?: string;
}

// ============================================
// POSITION TYPES
// ============================================

export interface Position {
  id: string;
  portfolio_id: string;
  ticker: string;
  shares: string;
  avg_cost: string;
  created_at: string;
  updated_at: string;
}

export interface PositionWithValue extends Position {
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
}

// ============================================
// ORDER TYPES
// ============================================

export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'FILLED' | 'REJECTED' | 'CANCELLED';

export interface Order {
  id: string;
  user_id: string;
  portfolio_id: string;
  ticker: string;
  side: OrderSide;
  quantity: string;
  price: string;
  status: OrderStatus;
  filled_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderInput {
  portfolio_id: string;
  ticker: string;
  side: OrderSide;
  quantity: number;
  price: number;
}

// ============================================
// HEDGED TRADE TYPES
// ============================================

export type HedgeStatus = 'PENDING' | 'EXECUTED' | 'FAILED' | 'ROLLED_BACK';

export interface HedgedTrade {
  id: string;
  user_id: string;
  portfolio_id: string;
  primary_order_id: string | null;
  hedge_order_id: string | null;
  primary_ticker: string;
  hedge_ticker: string;
  beta: string | null;
  r_squared: string | null;
  stability_warning: string | null;
  status: HedgeStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateHedgedTradeInput {
  portfolio_id: string;
  primary_ticker: string;
  primary_side: OrderSide;
  primary_quantity: number;
  primary_price: number;
  hedge_ticker: string;
  hedge_quantity: number;
  hedge_price: number;
}

// ============================================
// REPORT TYPES
// ============================================

export interface Report {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  report_type: string;
  start_date: string;
  end_date: string;
  input_params: Record<string, unknown>;
  output_data: Record<string, unknown> | null;
  generated_at: string;
}

export interface CreateReportInput {
  portfolio_id?: string;
  report_type: string;
  start_date: string;
  end_date: string;
}

// ============================================
// MARKET DATA TYPES
// ============================================

export interface MarketPrice {
  id: string;
  ticker: string;
  price: string;
  price_date: string;
  open_price: string | null;
  high_price: string | null;
  low_price: string | null;
  close_price: string | null;
  volume: number | null;
  source: string;
  fetched_at: string;
  expires_at: string;
}

export interface Quote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================
// INDICATOR TYPES
// ============================================

export interface IndicatorFeature {
  id: string;
  ticker: string;
  feature_date: string;
  window_size: number;
  sma: string | null;
  ema: string | null;
  rsi: string | null;
  macd: string | null;
  macd_signal: string | null;
  macd_histogram: string | null;
  composite_score: string | null;
  computed_at: string;
}

export interface ComputeIndicatorsInput {
  ticker: string;
  window_size?: number;
}

// ============================================
// NEWS TYPES
// ============================================

export type SentimentLabel = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export interface NewsArticle {
  id: string;
  ticker: string;
  source: string;
  headline: string;
  summary: string | null;
  url: string | null;
  published_at: string;
  sentiment_score: string | null;
  sentiment_label: SentimentLabel | null;
  ingested_at: string;
}

export interface NewsDailyAggregate {
  id: string;
  ticker: string;
  aggregate_date: string;
  article_count: number;
  avg_sentiment: string | null;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  sources: string[];
  computed_at: string;
}

// ============================================
// HEALTH TYPES
// ============================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs?: number;
    };
  };
}

// ============================================
// EXPLAINABILITY TYPES
// ============================================

export interface ExplanationRequest {
  ticker: string;
  date?: string;
}

export interface Explanation {
  ticker: string;
  date: string;
  indicators: {
    sma?: number;
    ema?: number;
    rsi?: number;
    macd?: number;
    composite_score?: number;
  } | null;
  sentiment: {
    avg_sentiment: number | null;
    article_count: number;
    positive_ratio: number;
  } | null;
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
}

