"use client";
import { useEffect, useState } from "react";
import { portfolioAPI, yahooFinanceAPI } from "@/lib/api";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Position {
  _id: string;
  ticker: string;
  shares: string;
  avg_cost: string;
  currentPrice?: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
}

export default function Portfolio() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPositions();
    }
  }, [isAuthenticated]);

  const fetchPositions = async () => {
    try {
      const positionsData = await portfolioAPI.getPositions();
      console.log('Fetched positions:', positionsData);
      
      // Fetch current prices for all positions
      const positionsWithPrices = await Promise.all(
        positionsData.map(async (pos: any) => {
          try {
            const quote = await yahooFinanceAPI.getQuote(pos.ticker);
            // Handle Decimal128 format from MongoDB
            const shares = pos.shares?.$numberDecimal 
              ? parseFloat(pos.shares.$numberDecimal)
              : parseFloat(pos.shares || "0");
            const avgCost = pos.avg_cost?.$numberDecimal 
              ? parseFloat(pos.avg_cost.$numberDecimal)
              : parseFloat(pos.avg_cost || "0");
            
            const currentValue = shares * quote.price;
            const costBasis = shares * avgCost;
            const profitLoss = currentValue - costBasis;
            const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

            return {
              ...pos,
              shares: shares.toString(),
              avg_cost: avgCost.toString(),
              currentPrice: quote.price,
              currentValue,
              profitLoss,
              profitLossPercent,
            };
          } catch (err) {
            console.error(`Error fetching price for ${pos.ticker}:`, err);
            return pos;
          }
        })
      );

      setPositions(positionsWithPrices);
    } catch (err: any) {
      setError(err.message || "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading portfolio...</div>
      </main>
    );
  }

  const totalValue = positions.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);
  const totalProfitLoss = positions.reduce((sum, pos) => sum + (pos.profitLoss || 0), 0);
  const totalCostBasis = totalValue - totalProfitLoss;
  const totalProfitLossPercent = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;

  return (
    <main className="grid gap-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold mb-1">My Portfolio</div>
            <div className="text-sm text-gray-400">
              {positions.length} position{positions.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button onClick={fetchPositions} className="btn">Refresh</button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500 rounded text-red-400">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-gray-400 mb-1">Total Value</div>
          <div className="text-2xl font-bold">${totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400 mb-1">Total P&L</div>
          <div className={`text-2xl font-bold ${totalProfitLoss >= 0 ? "text-green-400" : "text-red-400"}`}>
            {totalProfitLoss >= 0 ? "+" : ""}${totalProfitLoss.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400 mb-1">Return</div>
          <div className={`text-2xl font-bold ${totalProfitLossPercent >= 0 ? "text-green-400" : "text-red-400"}`}>
            {totalProfitLossPercent >= 0 ? "+" : ""}{totalProfitLossPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {positions.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-gray-400 mb-4">You don't have any positions yet</div>
            <Link href="/stock/AAPL" className="btn">
              Start Trading
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="pb-3 font-semibold">Ticker</th>
                <th className="pb-3 font-semibold text-right">Shares</th>
                <th className="pb-3 font-semibold text-right">Avg Cost</th>
                <th className="pb-3 font-semibold text-right">Current Price</th>
                <th className="pb-3 font-semibold text-right">Current Value</th>
                <th className="pb-3 font-semibold text-right">P&L</th>
                <th className="pb-3 font-semibold text-right">Return</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const plColor = (pos.profitLoss || 0) >= 0 ? "text-green-400" : "text-red-400";
                return (
                  <tr key={pos._id} className="border-b border-gray-800">
                    <td className="py-3">
                      <Link href={`/stock/${pos.ticker}`} className="font-semibold hover:text-blue-400">
                        {pos.ticker.toUpperCase()}
                      </Link>
                    </td>
                    <td className="py-3 text-right">{parseFloat(pos.shares).toFixed(2)}</td>
                    <td className="py-3 text-right">${parseFloat(pos.avg_cost).toFixed(2)}</td>
                    <td className="py-3 text-right">${pos.currentPrice?.toFixed(2) || "-"}</td>
                    <td className="py-3 text-right">
                      ${pos.currentValue?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || "-"}
                    </td>
                    <td className={`py-3 text-right ${plColor}`}>
                      {pos.profitLoss !== undefined
                        ? `${pos.profitLoss >= 0 ? "+" : ""}$${pos.profitLoss.toFixed(2)}`
                        : "-"}
                    </td>
                    <td className={`py-3 text-right ${plColor}`}>
                      {pos.profitLossPercent !== undefined
                        ? `${pos.profitLossPercent >= 0 ? "+" : ""}${pos.profitLossPercent.toFixed(2)}%`
                        : "-"}
                    </td>
                    <td className="py-3 text-right">
                      <Link href={`/stock/${pos.ticker}`} className="text-blue-400 hover:underline text-sm">
                        Trade
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
