"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/authContext";
import { yahooFinanceAPI, portfolioAPI } from "@/lib/api";
import OrderModal from "@/components/OrderModal";
import { useRouter } from "next/navigation";

const TradingViewWidget = dynamic(() => import("@/components/TradingViewWidget"), { ssr: false });

export default function Stock({ params }: { params: { ticker: string } }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [position, setPosition] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.ticker, isAuthenticated]);

  const fetchData = async () => {
    try {
      const quoteData = await yahooFinanceAPI.getQuote(params.ticker);
      setQuote(quoteData);

      if (isAuthenticated) {
        const positions = await portfolioAPI.getPositions();
        const pos = positions.find((p: any) => p.ticker.toUpperCase() === params.ticker.toUpperCase());
        setPosition(pos || null);
      }
    } catch (err) {
      console.error("Error fetching stock data:", err);
    } finally {
      setLoading(false);
    }
  };

  const openBuyModal = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setOrderType("buy");
    setOrderModalOpen(true);
  };

  const openSellModal = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    const shares = position?.shares?.$numberDecimal 
      ? parseFloat(position.shares.$numberDecimal)
      : parseFloat(position?.shares || "0");
    if (!position || shares <= 0) {
      alert("You don't own any shares of this stock");
      return;
    }
    setOrderType("sell");
    setOrderModalOpen(true);
  };

  const handleOrderSuccess = () => {
    setSuccessMessage(`${orderType === "buy" ? "Buy" : "Sell"} order executed successfully!`);
    setTimeout(() => setSuccessMessage(""), 3000);
    fetchData();
  };

  if (loading) {
    return (
      <main className="grid gap-6">
        <div className="card">Loading {params.ticker}...</div>
      </main>
    );
  }

  const changeColor = quote?.change >= 0 ? "text-green-400" : "text-red-400";

  return (
    <main className="grid gap-8 animate-fade-in">
      <div className="relative overflow-hidden">
        <div className={`absolute inset-0 ${quote?.change >= 0 ? 'bg-gradient-to-r from-emerald-600/10 to-green-600/10' : 'bg-gradient-to-r from-red-600/10 to-rose-600/10'} blur-2xl`}></div>
        <div className="card relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-4xl font-bold gradient-text mb-2">{params.ticker.toUpperCase()}</div>
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <span>📊</span>
                Real-time stock data from Yahoo Finance
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold mb-2">${quote?.price.toFixed(2)}</div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${quote?.change >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                <span className="text-lg">{quote?.change >= 0 ? "📈" : "📉"}</span>
                {quote?.change >= 0 ? "+" : ""}{quote?.change.toFixed(2)} ({quote?.changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-5 bg-emerald-500/10 border-2 border-emerald-500/50 rounded-xl text-emerald-400 font-semibold flex items-center gap-3 animate-fade-in shadow-lg">
          <span className="text-2xl">✅</span>
          {successMessage}
        </div>
      )}

      {position && (
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 blur-xl"></div>
          <div className="stat-card relative bg-gradient-to-br from-blue-900/40 to-cyan-900/20 border-blue-500/40">
            <div className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">💼</span>
              Your Position
            </div>
            <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">Shares</div>
              <div className="text-3xl font-bold text-white">
                {(() => {
                  const shares = position.shares?.$numberDecimal 
                    ? parseFloat(position.shares.$numberDecimal)
                    : parseFloat(position.shares || "0");
                  return shares.toFixed(2);
                })()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">Avg Cost</div>
              <div className="text-3xl font-bold text-blue-400">
                ${(() => {
                  const avgCost = position.avg_cost?.$numberDecimal 
                    ? parseFloat(position.avg_cost.$numberDecimal)
                    : parseFloat(position.avg_cost || "0");
                  return avgCost.toFixed(2);
                })()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">Current Value</div>
              <div className="text-3xl font-bold text-cyan-400">
                ${(() => {
                  const shares = position.shares?.$numberDecimal 
                    ? parseFloat(position.shares.$numberDecimal)
                    : parseFloat(position.shares || "0");
                  return (shares * quote?.price).toFixed(2);
                })()}
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <button
          onClick={openBuyModal}
          className="btn btn-green text-lg py-4"
        >
          <span className="text-2xl">💰</span>
          Buy {params.ticker}
        </button>
        <button
          onClick={openSellModal}
          className="btn btn-red text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!position || (position?.shares?.$numberDecimal ? parseFloat(position.shares.$numberDecimal) : parseFloat(position?.shares || "0")) <= 0}
        >
          <span className="text-2xl">💸</span>
          Sell {params.ticker}
        </button>
      </div>

      <div className="card p-0 overflow-hidden" style={{ minHeight: '600px' }}>
        <TradingViewWidget symbol={params.ticker.toUpperCase()} height={600} />
      </div>

      <div className="card">
        <div className="text-2xl font-bold mb-6 flex items-center gap-3">
          <span>📊</span>
          Market Data
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">Open</div>
            <div className="text-2xl font-bold text-white">${quote?.open?.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">High</div>
            <div className="text-2xl font-bold text-emerald-400">${quote?.high?.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">Low</div>
            <div className="text-2xl font-bold text-red-400">${quote?.low?.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">Volume</div>
            <div className="text-2xl font-bold text-purple-400">{quote?.volume?.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <OrderModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        ticker={params.ticker.toUpperCase()}
        currentPrice={quote?.price || 0}
        orderType={orderType}
        onSuccess={handleOrderSuccess}
        maxShares={position?.shares?.$numberDecimal 
          ? parseFloat(position.shares.$numberDecimal)
          : parseFloat(position?.shares || "0")}
      />
    </main>
  );
}
