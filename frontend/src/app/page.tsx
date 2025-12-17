'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

type View = 'auth' | 'dashboard' | 'portfolio' | 'trade' | 'market';

interface User {
  id: string;
  email: string;
  display_name: string | null;
}

interface Wallet {
  id: string;
  cash_balance: string;
}

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
}

export default function Home() {
  const [view, setView] = useState<View>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Trade state
  const [ticker, setTicker] = useState('AAPL');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState(10);
  const [price, setPrice] = useState(150);
  const [quote, setQuote] = useState<any>(null);

  // Deposit state
  const [depositAmount, setDepositAmount] = useState(10000);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = api.getToken();
    if (token) {
      const result = await api.getProfile();
      if (result.success && result.data) {
        setUser(result.data);
        setView('dashboard');
        await loadData();
      }
    }
    setLoading(false);
  }

  async function loadData() {
    const [walletResult, portfoliosResult] = await Promise.all([
      api.getWallet(),
      api.getPortfolios(),
    ]);

    if (walletResult.success && walletResult.data) {
      setWallet(walletResult.data);
    }

    if (portfoliosResult.success && portfoliosResult.data) {
      setPortfolios(portfoliosResult.data);
      if (portfoliosResult.data.length > 0) {
        setSelectedPortfolio(portfoliosResult.data[0]);
      }
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = isLogin
      ? await api.login(email, password)
      : await api.register(email, password, displayName);

    if (result.success && result.data) {
      api.setToken(result.data.tokens.accessToken);
      setUser(result.data.user);
      setView('dashboard');
      await loadData();
    } else {
      setError(result.error?.message || 'Authentication failed');
    }

    setLoading(false);
  }

  async function handleDeposit() {
    const idempotencyKey = `deposit-${Date.now()}-${Math.random()}`;
    const result = await api.deposit(depositAmount, idempotencyKey);

    if (result.success && result.data) {
      setWallet(result.data);
    } else {
      setError(result.error?.message || 'Deposit failed');
    }
  }

  async function handleCreatePortfolio() {
    const result = await api.createPortfolio(`Portfolio ${portfolios.length + 1}`);

    if (result.success && result.data) {
      setPortfolios([...portfolios, result.data]);
      setSelectedPortfolio(result.data);
    } else {
      setError(result.error?.message || 'Failed to create portfolio');
    }
  }

  async function handleGetQuote() {
    const result = await api.getQuote(ticker);

    if (result.success && result.data) {
      setQuote(result.data);
      setPrice(result.data.price);
    }
  }

  async function handlePlaceOrder() {
    if (!selectedPortfolio) {
      setError('Please select a portfolio first');
      return;
    }

    const createResult = await api.createOrder(
      selectedPortfolio.id,
      ticker,
      side,
      quantity,
      price
    );

    if (createResult.success && createResult.data) {
      const settleResult = await api.settleOrder(createResult.data.id);

      if (settleResult.success) {
        await loadData();
        setError(null);
      } else {
        setError(settleResult.error?.message || 'Order settlement failed');
      }
    } else {
      setError(createResult.error?.message || 'Order placement failed');
    }
  }

  function handleLogout() {
    api.setToken(null);
    setUser(null);
    setWallet(null);
    setPortfolios([]);
    setSelectedPortfolio(null);
    setView('auth');
  }

  if (loading && view === 'auth') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-slow">
          <div className="w-16 h-16 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-gold to-primary-500 flex items-center justify-center">
              <span className="font-display text-xl text-surface-dark">M</span>
            </div>
            <h1 className="font-display text-2xl font-bold bg-gradient-to-r from-accent-gold to-primary-400 bg-clip-text text-transparent">
              Market Whisperer
            </h1>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <span className="text-gray-400">{user.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-6xl mx-auto mb-4">
          <div className="glass-effect rounded-lg p-4 border border-red-500/30 bg-red-500/10">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-sm text-red-300 hover:text-red-200 mt-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Auth View */}
      {view === 'auth' && (
        <div className="max-w-md mx-auto animate-fade-in">
          <div className="glass-effect rounded-2xl p-8 gradient-border">
            <h2 className="font-display text-2xl mb-6 text-center">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-dark rounded-lg border border-white/10 focus:border-accent-gold focus:outline-none transition"
                    placeholder="Your name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-dark rounded-lg border border-white/10 focus:border-accent-gold focus:outline-none transition"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-dark rounded-lg border border-white/10 focus:border-accent-gold focus:outline-none transition"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-accent-gold to-primary-500 rounded-lg font-semibold text-surface-dark hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="text-center mt-6 text-gray-400">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-accent-gold hover:underline"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <div className="max-w-6xl mx-auto animate-fade-in">
          {/* Navigation */}
          <nav className="flex gap-2 mb-8">
            {['dashboard', 'portfolio', 'trade', 'market'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v as View)}
                className={`px-4 py-2 rounded-lg capitalize transition ${
                  view === v
                    ? 'bg-accent-gold text-surface-dark font-medium'
                    : 'glass-effect hover:bg-surface-hover'
                }`}
              >
                {v}
              </button>
            ))}
          </nav>

          {/* Wallet & Portfolio Summary */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Wallet Card */}
            <div className="glass-effect rounded-2xl p-6 gradient-border">
              <h3 className="text-gray-400 text-sm mb-2">Cash Balance</h3>
              <p className="font-display text-4xl text-accent-gold">
                ${parseFloat(wallet?.cash_balance || '0').toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </p>

              <div className="mt-4 flex gap-2">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-surface-dark rounded-lg border border-white/10 focus:border-accent-gold focus:outline-none"
                  min={1}
                />
                <button
                  onClick={handleDeposit}
                  className="px-4 py-2 bg-primary-600 rounded-lg hover:bg-primary-500 transition"
                >
                  Deposit
                </button>
              </div>
            </div>

            {/* Portfolios Card */}
            <div className="glass-effect rounded-2xl p-6 gradient-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-gray-400 text-sm">Portfolios</h3>
                <button
                  onClick={handleCreatePortfolio}
                  className="text-sm text-accent-gold hover:underline"
                >
                  + New
                </button>
              </div>

              {portfolios.length === 0 ? (
                <p className="text-gray-500">No portfolios yet</p>
              ) : (
                <div className="space-y-2">
                  {portfolios.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPortfolio(p)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition ${
                        selectedPortfolio?.id === p.id
                          ? 'bg-accent-gold/20 border border-accent-gold/50'
                          : 'bg-surface-dark hover:bg-surface-hover'
                      }`}
                    >
                      <span className="font-medium">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Portfolio View */}
      {view === 'portfolio' && selectedPortfolio && (
        <div className="max-w-6xl mx-auto animate-fade-in">
          <nav className="flex gap-2 mb-8">
            {['dashboard', 'portfolio', 'trade', 'market'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v as View)}
                className={`px-4 py-2 rounded-lg capitalize transition ${
                  view === v
                    ? 'bg-accent-gold text-surface-dark font-medium'
                    : 'glass-effect hover:bg-surface-hover'
                }`}
              >
                {v}
              </button>
            ))}
          </nav>

          <div className="glass-effect rounded-2xl p-6">
            <h2 className="font-display text-2xl mb-6">{selectedPortfolio.name}</h2>
            <PortfolioValuation portfolioId={selectedPortfolio.id} />
          </div>
        </div>
      )}

      {/* Trade View */}
      {view === 'trade' && (
        <div className="max-w-6xl mx-auto animate-fade-in">
          <nav className="flex gap-2 mb-8">
            {['dashboard', 'portfolio', 'trade', 'market'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v as View)}
                className={`px-4 py-2 rounded-lg capitalize transition ${
                  view === v
                    ? 'bg-accent-gold text-surface-dark font-medium'
                    : 'glass-effect hover:bg-surface-hover'
                }`}
              >
                {v}
              </button>
            ))}
          </nav>

          <div className="glass-effect rounded-2xl p-6 max-w-xl">
            <h2 className="font-display text-2xl mb-6">Place Order</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Ticker</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-3 bg-surface-dark rounded-lg border border-white/10 focus:border-accent-gold focus:outline-none font-mono"
                  />
                  <button
                    onClick={handleGetQuote}
                    className="px-4 py-2 bg-surface-hover rounded-lg hover:bg-white/10 transition"
                  >
                    Get Quote
                  </button>
                </div>
              </div>

              {quote && (
                <div className="p-4 bg-surface-dark rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-mono text-lg">{quote.ticker}</span>
                    <span className="font-mono text-lg text-accent-gold">
                      ${quote.price.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className={`text-sm ${
                      quote.change >= 0 ? 'text-primary-400' : 'text-red-400'
                    }`}
                  >
                    {quote.change >= 0 ? '+' : ''}
                    {quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setSide('BUY')}
                  className={`flex-1 py-3 rounded-lg font-medium transition ${
                    side === 'BUY'
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-dark text-gray-400'
                  }`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setSide('SELL')}
                  className={`flex-1 py-3 rounded-lg font-medium transition ${
                    side === 'SELL'
                      ? 'bg-red-600 text-white'
                      : 'bg-surface-dark text-gray-400'
                  }`}
                >
                  SELL
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-surface-dark rounded-lg border border-white/10 focus:border-accent-gold focus:outline-none"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Price</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-surface-dark rounded-lg border border-white/10 focus:border-accent-gold focus:outline-none"
                    min={0.01}
                    step={0.01}
                  />
                </div>
              </div>

              <div className="p-4 bg-surface-dark rounded-lg">
                <div className="flex justify-between text-gray-400">
                  <span>Total</span>
                  <span className="font-mono">
                    ${(quantity * price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={!selectedPortfolio}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  side === 'BUY'
                    ? 'bg-primary-600 hover:bg-primary-500'
                    : 'bg-red-600 hover:bg-red-500'
                } disabled:opacity-50`}
              >
                {side === 'BUY' ? 'Buy' : 'Sell'} {ticker}
              </button>

              {!selectedPortfolio && (
                <p className="text-center text-yellow-500 text-sm">
                  Create a portfolio first to place orders
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Market View */}
      {view === 'market' && (
        <div className="max-w-6xl mx-auto animate-fade-in">
          <nav className="flex gap-2 mb-8">
            {['dashboard', 'portfolio', 'trade', 'market'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v as View)}
                className={`px-4 py-2 rounded-lg capitalize transition ${
                  view === v
                    ? 'bg-accent-gold text-surface-dark font-medium'
                    : 'glass-effect hover:bg-surface-hover'
                }`}
              >
                {v}
              </button>
            ))}
          </nav>

          <MarketAnalysis />
        </div>
      )}
    </main>
  );
}

// Portfolio Valuation Component
function PortfolioValuation({ portfolioId }: { portfolioId: string }) {
  const [valuation, setValuation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await api.getPortfolioValuation(portfolioId);
      if (result.success && result.data) {
        setValuation(result.data);
      }
      setLoading(false);
    }
    load();
  }, [portfolioId]);

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  if (!valuation) {
    return <div className="text-gray-400">Failed to load valuation</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-surface-dark rounded-lg">
          <p className="text-sm text-gray-400">Market Value</p>
          <p className="font-mono text-xl text-accent-gold">
            ${valuation.summary.totalMarketValue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="p-4 bg-surface-dark rounded-lg">
          <p className="text-sm text-gray-400">Total Cost</p>
          <p className="font-mono text-xl">
            ${valuation.summary.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 bg-surface-dark rounded-lg">
          <p className="text-sm text-gray-400">Unrealized P&L</p>
          <p
            className={`font-mono text-xl ${
              valuation.summary.totalUnrealizedPnl >= 0 ? 'text-primary-400' : 'text-red-400'
            }`}
          >
            {valuation.summary.totalUnrealizedPnl >= 0 ? '+' : ''}$
            {valuation.summary.totalUnrealizedPnl.toLocaleString('en-US', {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="p-4 bg-surface-dark rounded-lg">
          <p className="text-sm text-gray-400">Return</p>
          <p
            className={`font-mono text-xl ${
              valuation.summary.totalUnrealizedPnlPercent >= 0 ? 'text-primary-400' : 'text-red-400'
            }`}
          >
            {valuation.summary.totalUnrealizedPnlPercent >= 0 ? '+' : ''}
            {valuation.summary.totalUnrealizedPnlPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Positions */}
      {valuation.positions.length > 0 ? (
        <div>
          <h4 className="text-lg font-medium mb-3">Positions</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm">
                  <th className="pb-3">Ticker</th>
                  <th className="pb-3">Shares</th>
                  <th className="pb-3">Avg Cost</th>
                  <th className="pb-3">Current</th>
                  <th className="pb-3">Market Value</th>
                  <th className="pb-3">P&L</th>
                </tr>
              </thead>
              <tbody>
                {valuation.positions.map((pos: any) => (
                  <tr key={pos.id} className="border-t border-white/10">
                    <td className="py-3 font-mono font-medium">{pos.ticker}</td>
                    <td className="py-3">{parseFloat(pos.shares).toFixed(2)}</td>
                    <td className="py-3 font-mono">${parseFloat(pos.avg_cost).toFixed(2)}</td>
                    <td className="py-3 font-mono">${pos.current_price.toFixed(2)}</td>
                    <td className="py-3 font-mono">${pos.market_value.toFixed(2)}</td>
                    <td
                      className={`py-3 font-mono ${
                        pos.unrealized_pnl >= 0 ? 'text-primary-400' : 'text-red-400'
                      }`}
                    >
                      {pos.unrealized_pnl >= 0 ? '+' : ''}${pos.unrealized_pnl.toFixed(2)} (
                      {pos.unrealized_pnl_percent.toFixed(2)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">No positions yet. Place some trades!</p>
      )}
    </div>
  );
}

// Market Analysis Component
function MarketAnalysis() {
  const [ticker, setTicker] = useState('AAPL');
  const [indicators, setIndicators] = useState<any>(null);
  const [explanation, setExplanation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    
    const [indResult, expResult] = await Promise.all([
      api.computeIndicators(ticker),
      api.getExplanation(ticker),
    ]);

    if (indResult.success) {
      setIndicators(indResult.data);
    }

    if (expResult.success) {
      setExplanation(expResult.data);
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="glass-effect rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-6">Market Analysis</h2>

        <div className="flex gap-4 mb-6">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="flex-1 px-4 py-3 bg-surface-dark rounded-lg border border-white/10 focus:border-accent-gold focus:outline-none font-mono"
            placeholder="Enter ticker"
          />
          <button
            onClick={analyze}
            disabled={loading}
            className="px-6 py-3 bg-accent-gold text-surface-dark font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {indicators && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Technical Indicators</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-surface-dark rounded-lg">
                <p className="text-sm text-gray-400">SMA</p>
                <p className="font-mono text-lg">{parseFloat(indicators.sma || 0).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-surface-dark rounded-lg">
                <p className="text-sm text-gray-400">EMA</p>
                <p className="font-mono text-lg">{parseFloat(indicators.ema || 0).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-surface-dark rounded-lg">
                <p className="text-sm text-gray-400">RSI</p>
                <p className="font-mono text-lg">{parseFloat(indicators.rsi || 0).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-surface-dark rounded-lg">
                <p className="text-sm text-gray-400">Composite Score</p>
                <p
                  className={`font-mono text-lg ${
                    parseFloat(indicators.composite_score || 0) >= 50
                      ? 'text-primary-400'
                      : 'text-red-400'
                  }`}
                >
                  {parseFloat(indicators.composite_score || 0).toFixed(0)}/100
                </p>
              </div>
            </div>
          </div>
        )}

        {explanation && (
          <div>
            <h3 className="font-medium mb-3">AI Explanation</h3>
            <div className="p-4 bg-surface-dark rounded-lg">
              <p className="text-gray-300 mb-2">{explanation.summary}</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Confidence:</span>
                <span
                  className={`px-2 py-0.5 rounded ${
                    explanation.confidence === 'high'
                      ? 'bg-primary-500/20 text-primary-400'
                      : explanation.confidence === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {explanation.confidence}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

