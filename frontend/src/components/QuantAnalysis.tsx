'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import StockChart from './StockChart'

interface Analysis {
  ticker: string
  score: number
  recommendation: string
  indicators: Record<string, number>
  explanation: string
  sentiment?: {
    sentMean_3d: number
    sentShock: number
    sentVsPrice: number
    articleCount: number
  }
  policy?: {
    fomcProximity: number
    policyTilt: number
    cpiProximity?: number
  }
  newsCount?: number
}

export default function QuantAnalysis() {
  const [ticker, setTicker] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
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
      setAvailableTickers(response.data.tickers)
    } catch (error) {
      console.error('Error fetching tickers:', error)
    }
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticker) return

    setError('')
    setLoading(true)
    setAnalysis(null)

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/quant/analysis/${ticker.toUpperCase()}`
      )
      setAnalysis(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to analyze ticker')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Quantitative Analysis</h2>

      {/* Analysis Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter Ticker Symbol
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  list="tickers"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., AADR, AALG, AAPB (use available tickers)"
                />
                <datalist id="tickers">
                  {availableTickers.slice(0, 50).map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <button
                type="submit"
                disabled={loading || !ticker}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            {availableTickers.length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                Available tickers: {availableTickers.slice(0, 20).join(', ')}
                {availableTickers.length > 20 && ` (+${availableTickers.length - 20} more)`}
              </div>
            )}
          </div>
        </form>

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <div className="font-semibold mb-1">Error:</div>
            <div>{error}</div>
            {availableTickers.length > 0 && (
              <div className="mt-2 text-sm">
                Try one of these available tickers: {availableTickers.slice(0, 10).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{analysis.ticker}</h3>
                <p className="text-sm text-gray-600">Composite Score: {analysis.score.toFixed(2)}</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                analysis.recommendation === 'long' ? 'bg-green-100 text-green-800' :
                analysis.recommendation === 'short' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {analysis.recommendation.toUpperCase()}
              </span>
            </div>

            {analysis.explanation && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h4 className="font-semibold text-blue-900 mb-2">AI Analysis:</h4>
                <pre className="text-blue-800 whitespace-pre-wrap text-sm">{analysis.explanation}</pre>
              </div>
            )}

            {/* Sentiment & Policy Summary */}
            {(analysis.sentiment || analysis.policy) && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.sentiment && (
                  <div className="bg-purple-50 border border-purple-200 rounded p-3">
                    <h5 className="font-semibold text-purple-900 mb-2 text-sm">News Sentiment</h5>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-purple-700">3-Day Mean:</span>
                        <span className="font-bold">
                          {analysis.sentiment.sentMean_3d > 0.6 ? 'Positive' : 
                           analysis.sentiment.sentMean_3d < 0.4 ? 'Negative' : 'Neutral'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">Sentiment Shock:</span>
                        <span className="font-bold">{analysis.sentiment.sentShock.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">Price Correlation:</span>
                        <span className="font-bold">{analysis.sentiment.sentVsPrice.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">Articles:</span>
                        <span className="font-bold">{analysis.sentiment.articleCount}</span>
                      </div>
                    </div>
                  </div>
                )}
                {analysis.policy && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <h5 className="font-semibold text-yellow-900 mb-2 text-sm">Policy Context</h5>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-yellow-700">FOMC Proximity:</span>
                        <span className="font-bold">{(analysis.policy.fomcProximity * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-700">Policy Tilt:</span>
                        <span className="font-bold">
                          {analysis.policy.policyTilt > 0 ? '+' : ''}{analysis.policy.policyTilt.toFixed(2)}
                        </span>
                      </div>
                      {analysis.policy.cpiProximity !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-yellow-700">CPI Proximity:</span>
                          <span className="font-bold">{(analysis.policy.cpiProximity * 100).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Indicators Grid */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Technical Indicators</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analysis.indicators || {}).map(([key, value]) => (
                <div key={key} className="border border-gray-200 rounded p-3">
                  <div className="text-sm text-gray-600 mb-1">{key}</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {typeof value === 'number' ? value.toFixed(4) : value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Price Chart</h3>
            <StockChart ticker={analysis.ticker} />
          </div>
        </div>
      )}
    </div>
  )
}

