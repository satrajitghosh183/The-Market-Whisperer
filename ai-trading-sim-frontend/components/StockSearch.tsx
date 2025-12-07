"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface StockSearchProps {
  popularStocks?: string[];
}

export default function StockSearch({ 
  popularStocks = ["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "NFLX"] 
}: StockSearchProps) {
  const [search, setSearch] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/stock/${search.trim().toUpperCase()}`);
      setSearch("");
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Enter ticker symbol (e.g., AAPL, TSLA, MSFT)"
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="btn">Search</button>
      </form>
      
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-400">Popular:</span>
        {popularStocks.map((ticker) => (
          <Link
            key={ticker}
            href={`/stock/${ticker}`}
            className="text-sm px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
          >
            {ticker}
          </Link>
        ))}
      </div>
    </div>
  );
}

