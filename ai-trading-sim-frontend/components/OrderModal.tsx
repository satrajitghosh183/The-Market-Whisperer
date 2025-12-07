"use client";
import { useState, useEffect } from "react";
import { orderAPI } from "@/lib/api";

interface OrderModalProps {
  open: boolean;
  onClose: () => void;
  ticker: string;
  currentPrice: number;
  orderType: "buy" | "sell";
  onSuccess: () => void;
  maxShares?: number;
}

export default function OrderModal({ open, onClose, ticker, currentPrice, orderType, onSuccess, maxShares }: OrderModalProps) {
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState(currentPrice.toFixed(2));
  const [dollarAmount, setDollarAmount] = useState("");
  const [buyByDollar, setBuyByDollar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Update price when currentPrice changes and format to 2 decimals
  useEffect(() => {
    setPrice(currentPrice.toFixed(2));
  }, [currentPrice]);

  // Auto-fill max shares when selling (only if not in dollar mode)
  useEffect(() => {
    if (orderType === "sell" && maxShares && maxShares > 0 && !quantity && !buyByDollar) {
      setQuantity(maxShares.toFixed(6));
    }
  }, [orderType, maxShares, quantity, buyByDollar]);

  // Auto-fill max dollar amount when switching to dollar mode for selling
  useEffect(() => {
    if (orderType === "sell" && buyByDollar && maxShares && !dollarAmount && price) {
      const maxDollarValue = maxShares * parseFloat(price);
      setDollarAmount(maxDollarValue.toFixed(2));
    }
  }, [orderType, buyByDollar, maxShares, dollarAmount, price]);

  // Calculate shares when dollar amount changes
  useEffect(() => {
    if (buyByDollar && dollarAmount && price) {
      const px = parseFloat(price);
      const dollars = parseFloat(dollarAmount);
      if (!isNaN(px) && !isNaN(dollars) && px > 0) {
        const calculatedShares = dollars / px;
        setQuantity(calculatedShares.toFixed(6));
      }
    }
  }, [dollarAmount, price, buyByDollar]);

  if (!open) return null;

  const handleClose = () => {
    setQuantity("");
    setDollarAmount("");
    setBuyByDollar(false);
    setError("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const qty = parseFloat(quantity);
      const px = parseFloat(price);

      if (isNaN(qty) || qty <= 0) {
        throw new Error("Invalid quantity");
      }
      if (isNaN(px) || px <= 0) {
        throw new Error("Invalid price");
      }

      // Validate sell quantity doesn't exceed max shares
      if (orderType === "sell" && maxShares) {
        if (qty > maxShares) {
          throw new Error(`You only have ${maxShares.toFixed(4)} shares available`);
        }
        // If buying by dollar, also validate dollar amount
        if (buyByDollar && dollarAmount) {
          const maxDollarValue = maxShares * px;
          const requestedDollars = parseFloat(dollarAmount);
          if (requestedDollars > maxDollarValue) {
            throw new Error(`You can only sell up to $${maxDollarValue.toFixed(2)} worth of shares`);
          }
        }
      }

      if (orderType === "buy") {
        await orderAPI.buy(ticker, qty, px);
      } else {
        await orderAPI.sell(ticker, qty, px);
      }

      onSuccess();
      onClose();
      // Reset form
      setQuantity("");
      setDollarAmount("");
      setBuyByDollar(false);
    } catch (err: any) {
      setError(err.message || "Order failed");
    } finally {
      setLoading(false);
    }
  };

  const totalValue = parseFloat(quantity || "0") * parseFloat(price || "0");
  const isBuy = orderType === "buy";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={handleClose}>
      <div className="card max-w-md w-full m-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-3xl">{isBuy ? "💰" : "💸"}</span>
            {isBuy ? "Buy" : "Sell"} {ticker}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-3xl leading-none hover:rotate-90 transition-transform">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl text-red-400 font-semibold flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="price" className="block text-sm font-semibold mb-2 text-gray-300">
              Price per Share ($)
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="input-modern"
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setBuyByDollar(false);
                setDollarAmount("");
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                !buyByDollar
                  ? "bg-blue-600 text-white"
                  : "bg-transparent text-gray-400 hover:text-white"
              }`}
            >
              📊 By Shares
            </button>
            <button
              type="button"
              onClick={() => {
                setBuyByDollar(true);
                setQuantity("");
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                buyByDollar
                  ? "bg-blue-600 text-white"
                  : "bg-transparent text-gray-400 hover:text-white"
              }`}
            >
              💵 By Dollar
            </button>
          </div>

          {buyByDollar ? (
            <div>
              <label htmlFor="dollarAmount" className="block text-sm font-semibold mb-2 text-gray-300">
                💵 Dollar Amount ($)
              </label>
              <input
                id="dollarAmount"
                type="number"
                step="0.01"
                min="0"
                max={orderType === "sell" && maxShares ? (maxShares * parseFloat(price)).toFixed(2) : undefined}
                value={dollarAmount}
                onChange={(e) => setDollarAmount(e.target.value)}
                required
                className="input-modern"
                placeholder={orderType === "sell" && maxShares ? (maxShares * parseFloat(price)).toFixed(2) : "100.00"}
              />
              {quantity && (
                <div className="mt-2 text-sm text-gray-400">
                  ≈ <span className="text-white font-semibold">{parseFloat(quantity).toFixed(4)}</span> shares
                  {orderType === "sell" && maxShares && (
                    <span className="text-gray-500"> (max: {maxShares.toFixed(4)})</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="quantity" className="block text-sm font-semibold mb-2 text-gray-300">
                📊 Quantity (Shares)
              </label>
              <input
                id="quantity"
                type="number"
                step="0.000001"
                min="0"
                max={orderType === "sell" && maxShares ? maxShares : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="input-modern"
                placeholder={orderType === "sell" && maxShares ? maxShares.toFixed(4) : "10"}
              />
              {orderType === "sell" && maxShares && (
                <div className="mt-2 text-sm text-gray-400">
                  You have <span className="text-white font-semibold">{maxShares.toFixed(4)}</span> shares available
                </div>
              )}
            </div>
          )}

          <div className="p-5 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-700/50">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-semibold">Total Value:</span>
              <span className="text-2xl font-bold text-white">${totalValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 btn ${
                isBuy ? "btn-green" : "btn-red"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? "Processing..." : isBuy ? "🚀 Buy Now" : "💸 Sell Now"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

