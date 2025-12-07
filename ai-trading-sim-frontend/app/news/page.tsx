"use client";
import { useEffect, useState, useMemo } from "react";
import { newsAPI } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  source: string;
  published: string;
  relatedTickers: string[];
  thumbnail: string | null;
  suggestion: {
    action: "BUY" | "SELL" | "HOLD";
    confidence: "Low" | "Medium" | "High";
    reason: string;
    tickers: string[];
    summary: string;
  };
}

export default function News() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');

  useEffect(() => {
    fetchNews();
  }, [filter]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const data = await newsAPI.getMarketNews(50);
      setArticles(data.articles);
    } catch (err) {
      console.error("Error fetching news:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = useMemo(() => {
    let filtered = articles;

    if (filter) {
      filtered = filtered.filter(article => article.suggestion.action.toLowerCase() === filter.toLowerCase());
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(lowerSearchTerm) ||
        article.summary.toLowerCase().includes(lowerSearchTerm) ||
        article.relatedTickers.some(ticker => ticker.toLowerCase().includes(lowerSearchTerm)) ||
        article.source.toLowerCase().includes(lowerSearchTerm)
      );
    }
    return filtered;
  }, [articles, filter, searchTerm]);

  const getSentimentColor = (action: "BUY" | "SELL" | "HOLD") => {
    if (action === "BUY") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (action === "SELL") return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  };

  const getSentimentEmoji = (action: "BUY" | "SELL" | "HOLD") => {
    if (action === "BUY") return "🟢";
    if (action === "SELL") return "🔴";
    return "🟡";
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && /^[A-Z]{1,5}$/.test(searchTerm.trim().toUpperCase())) {
      fetchTickerNews(searchTerm.trim().toUpperCase());
    } else {
      fetchNews();
    }
  };

  const fetchTickerNews = async (ticker: string) => {
    setLoading(true);
    try {
      const data = await newsAPI.getTickerNews(ticker);
      setArticles(data.articles);
      router.push(`/news?ticker=${ticker}`);
    } catch (err) {
      console.error(`Error fetching news for ${ticker}:`, err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const buyCount = articles.filter(a => a.suggestion.action === 'BUY').length;
  const sellCount = articles.filter(a => a.suggestion.action === 'SELL').length;
  const holdCount = articles.filter(a => a.suggestion.action === 'HOLD').length;

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Fetching latest market news...</div>
      </main>
    );
  }

  return (
    <main className="grid gap-8 animate-fade-in">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 blur-2xl"></div>
        <div className="card relative">
          <h1 className="text-3xl font-bold gradient-text mb-2">📰 Market News</h1>
          <p className="text-gray-400">Stay informed with the latest market developments and AI-powered stock suggestions.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">📰 Total News</div>
          <div className="text-4xl font-bold text-white">{articles.length}</div>
        </div>
        <Link href="/news?filter=buy" className="stat-card hover:scale-[1.02] transition-transform">
          <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">🟢 BUY Signals</div>
          <div className="text-4xl font-bold text-emerald-400">{buyCount}</div>
        </Link>
        <Link href="/news?filter=sell" className="stat-card hover:scale-[1.02] transition-transform">
          <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">🔴 SELL Signals</div>
          <div className="text-4xl font-bold text-red-400">{sellCount}</div>
        </Link>
        <Link href="/news?filter=hold" className="stat-card hover:scale-[1.02] transition-transform">
          <div className="text-sm text-gray-400 mb-2 font-semibold uppercase tracking-wider">🟡 HOLD Signals</div>
          <div className="text-4xl font-bold text-yellow-400">{holdCount}</div>
        </Link>
      </div>

      <div className="card">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search news by ticker, keyword, or company..."
            className="input-modern"
          />
          <button type="submit" className="btn btn-primary">
            🔍 Search
          </button>
        </form>
      </div>

      <div className="grid gap-6">
        {filteredArticles.length === 0 && (
          <div className="card text-center py-10 text-gray-400 text-lg">
            No news articles found for your criteria.
          </div>
        )}
        {filteredArticles.map((article, index) => (
          <div key={index} className="card flex flex-col md:flex-row gap-6 items-start">
            {article.thumbnail && (
              <img
                src={article.thumbnail}
                alt={article.title}
                className="w-full md:w-48 h-32 object-cover rounded-lg flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-xl font-bold text-white hover:text-blue-400 transition-colors block mb-2">
                {article.title}
              </a>
              <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
                <span>📅 {new Date(article.published).toLocaleDateString()}</span>
                <span>•</span>
                <span>📰 {article.source}</span>
                {article.relatedTickers.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-blue-400">{article.relatedTickers.join(", ")}</span>
                  </>
                )}
              </div>
              {article.suggestion.summary && (
                <p className="text-gray-300 mb-4">{article.suggestion.summary}</p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(article.suggestion.action)}`}>
                  <span className="text-lg leading-none">{getSentimentEmoji(article.suggestion.action)}</span>
                  {article.suggestion.action}
                </div>
                <div className="text-sm text-gray-400">
                  {article.suggestion.confidence} Confidence
                </div>
                <div className="text-sm text-gray-500">
                  {article.suggestion.reason}
                </div>
                {article.suggestion.tickers.length > 0 && (
                  <button
                    onClick={() => router.push(`/stock/${article.suggestion.tickers[0]}`)}
                    className="btn btn-sm btn-primary ml-auto"
                  >
                    Trade {article.suggestion.tickers[0]}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card text-center py-6 text-gray-500 text-sm">
        <p className="mb-2">💡 How to Use Market News</p>
        <div className="grid md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
          <div>
            <p className="font-semibold text-emerald-400 mb-1">🟢 BUY Signals</p>
            <p className="text-xs">Positive news sentiment detected. Articles mention growth, profits, or bullish indicators. Consider buying these stocks for potential gains.</p>
          </div>
          <div>
            <p className="font-semibold text-red-400 mb-1">🔴 SELL Signals</p>
            <p className="text-xs">Negative news sentiment detected. Articles mention losses, concerns, or bearish indicators. Consider selling or avoiding these stocks.</p>
          </div>
          <div>
            <p className="font-semibold text-yellow-400 mb-1">🟡 HOLD Signals</p>
            <p className="text-xs">Neutral or mixed sentiment. No clear direction indicated. Monitor the stock and wait for clearer signals before acting.</p>
          </div>
        </div>
        <p className="mt-6 text-xs text-gray-600">
          ⚠️ Disclaimer: AI suggestions are based on sentiment analysis of news articles and should not be considered financial advice. Always do your own research and consider multiple factors before making investment decisions.
        </p>
      </div>
    </main>
  );
}

