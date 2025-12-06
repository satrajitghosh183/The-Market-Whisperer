'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface NewsArticle {
  title: string
  description: string
  url: string
  publishedAt: string
  source: string
  ticker?: string
}

interface SentimentData {
  sentMean_3d: number
  sentShock: number
  sentVsPrice: number
  articleCount: number
  individualSentiments?: Array<{ score: number; label: string }>
}

export default function NewsSentimentView() {
  const [ticker, setTicker] = useState('')
  const [news, setNews] = useState<NewsArticle[]>([])
  const [sentiment, setSentiment] = useState<SentimentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableTickers, setAvailableTickers] = useState<string[]>([])

  useEffect(() => {
    fetchAvailableTickers()
  }, [])

  const fetchAvailableTickers = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/quant/tickers`
      )
      setAvailableTickers(response.data.tickers || [])
    } catch (error) {
      console.error('Error fetching tickers:', error)
    }
  }

  const fetchNewsAndSentiment = async () => {
    if (!ticker) return

    setLoading(true)
    setError('')
    setNews([])
    setSentiment(null)

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/news/ticker/${ticker.toUpperCase()}/sentiment`
      )

      if (response.data.success) {
        setNews(response.data.articles || [])
        setSentiment(response.data.sentiment || null)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch news and sentiment')
    } finally {
      setLoading(false)
    }
  }

  const getSentimentColor = (score: number) => {
    if (score > 0.6) return 'text-green-600 bg-green-50'
    if (score < 0.4) return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  const getSentimentLabel = (score: number) => {
    if (score > 0.6) return 'Positive'
    if (score < 0.4) return 'Negative'
    return 'Neutral'
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">News & Sentiment Analysis</h2>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter Ticker Symbol
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              list="tickers"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., AAPL, TSLA, NVDA"
            />
            <datalist id="tickers">
              {availableTickers.slice(0, 50).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchNewsAndSentiment}
              disabled={loading || !ticker}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Fetch News & Sentiment'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Sentiment Summary */}
      {sentiment && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Sentiment Analysis for {ticker}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded p-4">
              <div className="text-sm text-gray-600 mb-1">3-Day Mean Sentiment</div>
              <div className={`text-2xl font-bold ${getSentimentColor(sentiment.sentMean_3d)} px-3 py-2 rounded`}>
                {getSentimentLabel(sentiment.sentMean_3d)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Score: {sentiment.sentMean_3d.toFixed(3)} (0-1 scale)
              </div>
            </div>
            <div className="border border-gray-200 rounded p-4">
              <div className="text-sm text-gray-600 mb-1">Sentiment Shock</div>
              <div className="text-2xl font-bold text-orange-600">
                {sentiment.sentShock.toFixed(3)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Deviation from 7-day average
              </div>
            </div>
            <div className="border border-gray-200 rounded p-4">
              <div className="text-sm text-gray-600 mb-1">Sentiment-Price Correlation</div>
              <div className="text-2xl font-bold text-blue-600">
                {sentiment.sentVsPrice.toFixed(3)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Range: -1 to +1
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Articles analyzed: {sentiment.articleCount}
          </div>
        </div>
      )}

      {/* News Articles */}
      {news.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Recent News Articles ({news.length})
          </h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {news.map((article, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900 flex-1">{article.title}</h4>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(article.publishedAt).toLocaleDateString()}
                  </span>
                </div>
                {article.description && (
                  <p className="text-sm text-gray-600 mb-2">{article.description}</p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{article.source}</span>
                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Read more →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!ticker && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">Enter a ticker symbol above to view news and sentiment analysis</p>
        </div>
      )}
    </div>
  )
}

