-- Market Whisperer Database Schema
-- Run this in Supabase SQL Editor or via migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- WALLETS TABLE (one per user)
-- ============================================
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    cash_balance NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (cash_balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_user ON wallets(user_id);

-- ============================================
-- LEDGER TRANSACTIONS (groups related entries)
-- ============================================
CREATE TABLE IF NOT EXISTS ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tx_type VARCHAR(50) NOT NULL, -- DEPOSIT, WITHDRAWAL, BUY, SELL, HEDGE_BUY, HEDGE_SELL
    reference_id UUID, -- links to order_id or other entity
    idempotency_key VARCHAR(255) UNIQUE, -- for idempotent operations
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_tx_user ON ledger_transactions(user_id);
CREATE INDEX idx_ledger_tx_idempotency ON ledger_transactions(idempotency_key);

-- ============================================
-- LEDGER ENTRIES (individual debit/credit postings)
-- ============================================
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
    account_type VARCHAR(50) NOT NULL, -- CASH, STOCK, EQUITY, REALIZED_PNL
    account_ref VARCHAR(100), -- e.g., ticker symbol for stock accounts
    debit NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_debit_or_credit CHECK (
        (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0)
    )
);

CREATE INDEX idx_ledger_entries_tx ON ledger_entries(tx_id);

-- ============================================
-- PORTFOLIOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_portfolios_user ON portfolios(user_id);

-- ============================================
-- POSITIONS TABLE (holds per portfolio/ticker)
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    shares NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (shares >= 0),
    avg_cost NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (avg_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(portfolio_id, ticker)
);

CREATE INDEX idx_positions_portfolio ON positions(portfolio_id);
CREATE INDEX idx_positions_ticker ON positions(ticker);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TYPE order_side AS ENUM ('BUY', 'SELL');
CREATE TYPE order_status AS ENUM ('PENDING', 'FILLED', 'REJECTED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    side order_side NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
    price NUMERIC(20, 8) NOT NULL CHECK (price > 0),
    status order_status NOT NULL DEFAULT 'PENDING',
    filled_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_portfolio ON orders(portfolio_id);
CREATE INDEX idx_orders_status ON orders(status);

-- ============================================
-- HEDGED TRADES TABLE (two-leg coupled trades)
-- ============================================
CREATE TYPE hedge_status AS ENUM ('PENDING', 'EXECUTED', 'FAILED', 'ROLLED_BACK');

CREATE TABLE IF NOT EXISTS hedged_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    primary_order_id UUID REFERENCES orders(id),
    hedge_order_id UUID REFERENCES orders(id),
    primary_ticker VARCHAR(20) NOT NULL,
    hedge_ticker VARCHAR(20) NOT NULL,
    beta NUMERIC(10, 6),
    r_squared NUMERIC(10, 6),
    stability_warning TEXT,
    status hedge_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hedged_trades_user ON hedged_trades(user_id);

-- ============================================
-- REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    report_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    input_params JSONB NOT NULL DEFAULT '{}',
    output_data JSONB,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_portfolio ON reports(portfolio_id);

-- ============================================
-- MARKET PRICES CACHE
-- ============================================
CREATE TABLE IF NOT EXISTS market_prices_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker VARCHAR(20) NOT NULL,
    price NUMERIC(20, 8) NOT NULL,
    price_date DATE NOT NULL,
    open_price NUMERIC(20, 8),
    high_price NUMERIC(20, 8),
    low_price NUMERIC(20, 8),
    close_price NUMERIC(20, 8),
    volume BIGINT,
    source VARCHAR(50) NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(ticker, price_date, source)
);

CREATE INDEX idx_market_prices_ticker ON market_prices_cache(ticker);
CREATE INDEX idx_market_prices_date ON market_prices_cache(price_date);
CREATE INDEX idx_market_prices_expires ON market_prices_cache(expires_at);

-- ============================================
-- INDICATOR FEATURES (quant analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS indicator_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker VARCHAR(20) NOT NULL,
    feature_date DATE NOT NULL,
    window_size INT NOT NULL,
    sma NUMERIC(20, 8),
    ema NUMERIC(20, 8),
    rsi NUMERIC(10, 4),
    macd NUMERIC(20, 8),
    macd_signal NUMERIC(20, 8),
    macd_histogram NUMERIC(20, 8),
    composite_score NUMERIC(10, 4),
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(ticker, feature_date, window_size)
);

CREATE INDEX idx_indicator_features_ticker ON indicator_features(ticker);
CREATE INDEX idx_indicator_features_date ON indicator_features(feature_date);

-- ============================================
-- NEWS ARTICLES
-- ============================================
CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker VARCHAR(20) NOT NULL,
    source VARCHAR(100) NOT NULL,
    headline TEXT NOT NULL,
    summary TEXT,
    url TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    sentiment_score NUMERIC(5, 4), -- -1 to 1
    sentiment_label VARCHAR(20), -- POSITIVE, NEGATIVE, NEUTRAL
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(ticker, url)
);

CREATE INDEX idx_news_articles_ticker ON news_articles(ticker);
CREATE INDEX idx_news_articles_published ON news_articles(published_at);

-- ============================================
-- NEWS DAILY AGGREGATES
-- ============================================
CREATE TABLE IF NOT EXISTS news_daily_aggregates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker VARCHAR(20) NOT NULL,
    aggregate_date DATE NOT NULL,
    article_count INT NOT NULL DEFAULT 0,
    avg_sentiment NUMERIC(5, 4),
    positive_count INT NOT NULL DEFAULT 0,
    negative_count INT NOT NULL DEFAULT 0,
    neutral_count INT NOT NULL DEFAULT 0,
    sources JSONB NOT NULL DEFAULT '[]',
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(ticker, aggregate_date)
);

CREATE INDEX idx_news_daily_ticker ON news_daily_aggregates(ticker);
CREATE INDEX idx_news_daily_date ON news_daily_aggregates(aggregate_date);

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hedged_trades_updated_at BEFORE UPDATE ON hedged_trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEW: Ledger balance check (for reconciliation)
-- ============================================
CREATE OR REPLACE VIEW ledger_balance_check AS
SELECT 
    tx_id,
    SUM(debit) as total_debits,
    SUM(credit) as total_credits,
    SUM(debit) - SUM(credit) as balance_diff
FROM ledger_entries
GROUP BY tx_id;

-- ============================================
-- VIEW: User wallet reconciliation from ledger
-- ============================================
CREATE OR REPLACE VIEW wallet_ledger_reconciliation AS
SELECT 
    lt.user_id,
    SUM(CASE WHEN le.account_type = 'CASH' THEN le.debit ELSE 0 END) as total_cash_debits,
    SUM(CASE WHEN le.account_type = 'CASH' THEN le.credit ELSE 0 END) as total_cash_credits,
    SUM(CASE WHEN le.account_type = 'CASH' THEN le.debit - le.credit ELSE 0 END) as cash_balance_from_ledger
FROM ledger_transactions lt
JOIN ledger_entries le ON le.tx_id = lt.id
GROUP BY lt.user_id;

