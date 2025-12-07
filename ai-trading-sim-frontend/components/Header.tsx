"use client";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { useEffect, useState } from "react";
import { walletAPI } from "@/lib/api";

export function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      walletAPI.getWallet()
        .then((wallet) => {
          console.log('Wallet data:', wallet);
          const balance = wallet.available_balance?.$numberDecimal 
            ? parseFloat(wallet.available_balance.$numberDecimal)
            : parseFloat(wallet.available_balance || '0');
          console.log('Parsed balance:', balance);
          setBalance(balance);
        })
        .catch((err) => console.error('Error fetching wallet:', err));
    } else {
      setBalance(null);
    }
  }, [isAuthenticated]);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/50 mb-8 shadow-lg">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold gradient-text hover:scale-105 transition-transform">
            📈 AI Trading Simulator
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {isAuthenticated ? (
              <>
                <Link href="/" className="text-gray-300 hover:text-white font-medium transition-colors">Dashboard</Link>
                <Link href="/portfolio" className="text-gray-300 hover:text-white font-medium transition-colors">Portfolio</Link>
                <Link href="/wallet" className="text-gray-300 hover:text-white font-medium transition-colors">Wallet</Link>
                <Link href="/hedging" className="text-gray-300 hover:text-white font-medium transition-colors">Hedging</Link>
                <Link href="/reports" className="text-gray-300 hover:text-white font-medium transition-colors">Reports</Link>
                <Link href="/news" className="text-gray-300 hover:text-white font-medium transition-colors">News</Link>
                <div className="flex items-center gap-4 ml-6 pl-6 border-l border-slate-700">
                  <div className="flex flex-col items-end">
                    <div className="text-sm font-semibold text-white">{user?.name}</div>
                    {balance !== null && (
                      <div className="text-xs font-bold text-emerald-400">
                        ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                  <button onClick={logout} className="btn-sm btn-outline">Logout</button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-white font-medium transition-colors">Login</Link>
                <Link href="/register" className="btn-sm">Get Started</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

