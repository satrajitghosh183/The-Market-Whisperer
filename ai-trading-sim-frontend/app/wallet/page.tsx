"use client";
import { useEffect, useState } from "react";
import { walletAPI } from "@/lib/api";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";

export default function Wallet() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWallet();
    }
  }, [isAuthenticated]);

  const fetchWallet = async () => {
    try {
      const data = await walletAPI.getWallet();
      console.log('Fetched wallet:', data);
      setWallet(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      const amount = parseFloat(depositAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      await walletAPI.deposit(amount);
      setSuccess(`Successfully deposited $${amount.toLocaleString()}`);
      setDepositAmount("");
      fetchWallet();
    } catch (err: any) {
      setError(err.message || "Deposit failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      await walletAPI.withdraw(amount);
      setSuccess(`Successfully withdrew $${amount.toLocaleString()}`);
      setWithdrawAmount("");
      fetchWallet();
    } catch (err: any) {
      setError(err.message || "Withdrawal failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading wallet...</div>
      </main>
    );
  }

  return (
    <main className="grid gap-6 max-w-4xl mx-auto">
      <div className="card">
        <h1 className="text-2xl font-bold mb-2">My Wallet</h1>
        <p className="text-gray-400 text-sm">Manage your trading account balance</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500 rounded text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500 rounded text-green-400">
          {success}
        </div>
      )}

      <div className="card">
        <div className="text-sm text-gray-400 mb-2">Available Balance</div>
        <div className="text-4xl font-bold text-green-400">
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
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Deposit Funds</h2>
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <label htmlFor="depositAmount" className="block text-sm font-medium mb-1">
                Amount ($)
              </label>
              <input
                id="depositAmount"
                type="number"
                step="0.01"
                min="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-green-500"
                placeholder="1000.00"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="w-full btn bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? "Processing..." : "Deposit"}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Withdraw Funds</h2>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label htmlFor="withdrawAmount" className="block text-sm font-medium mb-1">
                Amount ($)
              </label>
              <input
                id="withdrawAmount"
                type="number"
                step="0.01"
                min="0"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-red-500"
                placeholder="500.00"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="w-full btn bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? "Processing..." : "Withdraw"}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-2">Wallet Information</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Wallet ID:</span>
            <span className="font-mono">{wallet?._id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Created:</span>
            <span>{new Date(wallet?.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </main>
  );
}

