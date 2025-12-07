"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { walletAPI, portfolioAPI } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Page() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockSearch, setStockSearch] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const fetchDashboardData = async () => {
    try {
      const [walletData, positionsData] = await Promise.all([
        walletAPI.getWallet(),
        portfolioAPI.getPositions(),
      ]);
      setWallet(walletData);
      setPositions(positionsData);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStockSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (stockSearch.trim()) {
      router.push(`/stock/${stockSearch.trim().toUpperCase()}`);
      setStockSearch("");
    }
  };

  if (!isAuthenticated && !authLoading) {
    return (
      <main className="grid gap-8 animate-fade-in">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 blur-3xl"></div>
          <div className="card text-center py-20 relative">
            <h1 className="text-6xl font-bold mb-6 gradient-text">AI Trading Simulator</h1>
            <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Practice trading with real market data from Yahoo Finance. 
              Track your portfolio, execute trades, and learn without risking real money.
            </p>
            <div className="flex gap-6 justify-center">
              <Link href="/register" className="btn text-lg px-8 py-4">
                🚀 Get Started Free
              </Link>
              <Link href="/login" className="btn btn-outline text-lg px-8 py-4">
                Login
              </Link>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold mb-4">Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-lg font-semibold mb-2">📈 Real Market Data</div>
              <div className="text-sm text-gray-400">
                Live stock prices and charts powered by Yahoo Finance and TradingView
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold mb-2">💼 Portfolio Management</div>
              <div className="text-sm text-gray-400">
                Track your positions, P&L, and performance in real-time
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold mb-2">🔐 Secure Trading</div>
              <div className="text-sm text-gray-400">
                JWT authentication and secure backend API for all transactions
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Search Stocks</h2>
          <form onSubmit={handleStockSearch} className="flex gap-3">
            <input
              type="text"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              placeholder="Enter ticker symbol (e.g., AAPL, TSLA, MSFT)"
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="btn">Search</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-400">Popular:</span>
            {["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA"].map((ticker) => (
              <Link
                key={ticker}
                href={`/stock/${ticker}`}
                className="text-sm px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded"
              >
                {ticker}
              </Link>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="grid gap-8 animate-fade-in">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-blue-600/10 blur-2xl"></div>
        <div className="card relative">
          <h1 className="text-3xl font-bold mb-2">Welcome back, <span className="gradient-text">{user?.name}</span>! 👋</h1>
          <p className="text-gray-400">Here's your trading overview</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">💰 Wallet Balance</div>
          <div className="text-4xl font-bold text-emerald-400 mb-2">
            ${(() => {
              // Handle Decimal128 format from MongoDB
              const balanceValue = wallet?.available_balance?.$numberDecimal 
                ? parseFloat(wallet.available_balance.$numberDecimal)
                : parseFloat(wallet?.available_balance || "0");
              return balanceValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
            })()}
          </div>
          <Link href="/wallet" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold mt-3 group">
            Manage Wallet 
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">📊 Open Positions</div>
          <div className="text-4xl font-bold text-blue-400 mb-2">{positions.length}</div>
          <Link href="/portfolio" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold mt-3 group">
            View Portfolio 
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">⚡ Active Stocks</div>
          <div className="text-4xl font-bold text-purple-400 mb-2">
            {positions.filter(p => {
              const shares = p.shares?.$numberDecimal 
                ? parseFloat(p.shares.$numberDecimal)
                : parseFloat(p.shares || "0");
              return shares > 0;
            }).length}
          </div>
          <div className="text-sm text-gray-500 mt-3">Stocks with holdings</div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <span className="text-3xl">🔍</span>
          Search & Trade Stocks
        </h2>
        <form onSubmit={handleStockSearch} className="flex gap-4 mb-6">
          <input
            type="text"
            value={stockSearch}
            onChange={(e) => setStockSearch(e.target.value)}
            placeholder="Enter ticker symbol (e.g., AAPL, TSLA, MSFT)"
            className="input-modern flex-1"
          />
          <button type="submit" className="btn">
            🚀 Search
          </button>
        </form>
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm text-gray-400 font-semibold">🔥 Trending:</span>
          {["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "NFLX"].map((ticker) => (
            <Link
              key={ticker}
              href={`/stock/${ticker}`}
              className="px-4 py-2 bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-slate-600/50 hover:to-slate-700/50 rounded-lg font-semibold text-sm transition-all duration-200 border border-slate-600/50 hover:border-slate-500/50 hover:scale-105"
            >
              {ticker}
            </Link>
          ))}
        </div>
      </div>

      {positions.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-3xl">📈</span>
              Recent Positions
            </h2>
            <Link href="/portfolio" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold group">
              View All 
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {positions.slice(0, 4).map((pos) => {
              const shares = pos.shares?.$numberDecimal 
                ? parseFloat(pos.shares.$numberDecimal)
                : parseFloat(pos.shares || "0");
              const avgCost = pos.avg_cost?.$numberDecimal 
                ? parseFloat(pos.avg_cost.$numberDecimal)
                : parseFloat(pos.avg_cost || "0");
              
              return (
                <Link
                  key={pos._id}
                  href={`/stock/${pos.ticker}`}
                  className="stat-card group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-2xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
                      {pos.ticker.toUpperCase()}
                    </div>
                    <div className="text-2xl">📊</div>
                  </div>
                  <div className="text-sm text-gray-400 mb-1">
                    <span className="font-semibold text-white">{shares.toFixed(2)}</span> shares
                  </div>
                  <div className="text-xs text-gray-500">
                    Avg Cost: <span className="text-gray-400 font-semibold">${avgCost.toFixed(2)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
