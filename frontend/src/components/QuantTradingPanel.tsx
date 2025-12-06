'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import StockChart from './StockChart'

interface StockAnalysis {
  ticker: string
  score: number
  recommendation: string
  indicators: Record<string, number>
  explanation: string
  currentPrice?: number
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

export default function QuantTradingPanel() {
  const { user } = useAuth()
  const [selectedTicker, setSelectedTicker] = useState<string>('')
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null)
  const [availableTickers, setAvailableTickers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [llmPrompt, setLlmPrompt] = useState('')
  const [llmResponse, setLlmResponse] = useState('')
  const [loadingLlm, setLoadingLlm] = useState(false)

  useEffect(() => {
    fetchAvailableTickers()
  }, [])

  useEffect(() => {
    if (selectedTicker) {
      analyzeTicker()
    }
  }, [selectedTicker])

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

  const analyzeTicker = async () => {
    if (!selectedTicker) return

    setLoading(true)
    setError('')
    setAnalysis(null)

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/quant/analysis/${selectedTicker}`
      )
      
      if (response.data.error) {
        setError(response.data.error)
        return
      }

      setAnalysis(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to analyze ticker')
    } finally {
      setLoading(false)
    }
  }

  const handleLlmQuery = async () => {
    if (!llmPrompt.trim()) return

    setLoadingLlm(true)
    setLlmResponse('')

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/llm/strategy`,
        { prompt: llmPrompt }
      )
      setLlmResponse(response.data.strategy || 'No response generated')
    } catch (err: any) {
      setLlmResponse(err.response?.data?.error || 'Failed to generate response')
    } finally {
      setLoadingLlm(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">High-Volume Quant Trading Panel</h2>
        <select
          value={selectedTicker}
          onChange={(e) => setSelectedTicker(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Select ticker for analysis...</option>
          {availableTickers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Analysis Results */}
      {selectedTicker && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Analysis & Chart */}
          <div className="space-y-6">
            {loading ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="text-gray-500">Analyzing {selectedTicker}...</div>
              </div>
            ) : analysis ? (
              <>
                {/* Analysis Summary */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{analysis.ticker}</h3>
                      <p className="text-sm text-gray-600">
                        Composite Score: <span className="font-semibold">{analysis.score.toFixed(2)}</span>
                      </p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                      analysis.recommendation === 'long' ? 'bg-green-100 text-green-800' :
                      analysis.recommendation === 'short' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {analysis.recommendation.toUpperCase()}
                    </span>
                  </div>

                  {/* LLM Explanation */}
                  {analysis.explanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-4">
                      <h4 className="font-semibold text-blue-900 mb-2">AI Analysis:</h4>
                      <pre className="text-blue-800 whitespace-pre-wrap text-sm font-mono">
                        {analysis.explanation}
                      </pre>
                    </div>
                  )}

                  {/* Sentiment & Policy Data */}
                  {(analysis.sentiment || analysis.policy) && (
                    <div className="mt-4 space-y-3">
                      {analysis.sentiment && (
                        <div className="bg-purple-50 border border-purple-200 rounded p-3">
                          <h5 className="font-semibold text-purple-900 mb-2 text-sm">News Sentiment</h5>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <div className="text-purple-700">3-Day Mean</div>
                              <div className="font-bold">
                                {analysis.sentiment.sentMean_3d > 0.6 ? 'Positive' : 
                                 analysis.sentiment.sentMean_3d < 0.4 ? 'Negative' : 'Neutral'}
                              </div>
                            </div>
                            <div>
                              <div className="text-purple-700">Shock</div>
                              <div className="font-bold">{analysis.sentiment.sentShock.toFixed(3)}</div>
                            </div>
                            <div>
                              <div className="text-purple-700">Articles</div>
                              <div className="font-bold">{analysis.sentiment.articleCount}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      {analysis.policy && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <h5 className="font-semibold text-yellow-900 mb-2 text-sm">Policy Context</h5>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-yellow-700">FOMC Proximity</div>
                              <div className="font-bold">{(analysis.policy.fomcProximity * 100).toFixed(1)}%</div>
                            </div>
                            <div>
                              <div className="text-yellow-700">Policy Tilt</div>
                              <div className="font-bold">
                                {analysis.policy.policyTilt > 0 ? '+' : ''}{analysis.policy.policyTilt.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Technical Indicators */}
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Technical Indicators:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(analysis.indicators || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between border-b border-gray-200 pb-1">
                          <span className="text-gray-600">{key}:</span>
                          <span className="font-medium">
                            {typeof value === 'number' ? value.toFixed(4) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Historical Data Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Historical Price Data</h3>
                  <StockChart ticker={selectedTicker} />
                </div>
              </>
            ) : null}
          </div>

          {/* Right Column: LLM Interface */}
          <div className="space-y-6">
            {/* LLM Query Interface */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                AI Trading Strategy Assistant
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ask AI for trading strategy or analysis:
                  </label>
                  <textarea
                    value={llmPrompt}
                    onChange={(e) => setLlmPrompt(e.target.value)}
                    placeholder="e.g., What's the best strategy for a bullish market? How should I hedge my portfolio?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  />
                </div>
                <button
                  onClick={handleLlmQuery}
                  disabled={loadingLlm || !llmPrompt.trim()}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {loadingLlm ? 'Generating...' : 'Generate Strategy'}
                </button>

                {llmResponse && (
                  <div className="bg-purple-50 border border-purple-200 rounded p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">AI Response:</h4>
                    <p className="text-purple-800 whitespace-pre-wrap">{llmResponse}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setLlmPrompt(`Analyze ${selectedTicker} and provide a detailed trading strategy.`)}
                  disabled={!selectedTicker}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  Generate Strategy for {selectedTicker || 'Selected Ticker'}
                </button>
                <button
                  onClick={() => setLlmPrompt(`What are the key risk factors for ${selectedTicker}?`)}
                  disabled={!selectedTicker}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm"
                >
                  Risk Analysis
                </button>
                <button
                  onClick={() => setLlmPrompt(`How should I position myself in the market given current conditions?`)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  Market Positioning Advice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedTicker && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">Select a ticker above to begin quantitative analysis</p>
          <p className="text-gray-500 text-sm mt-2">
            High-volume trading panel with AI-powered insights and real-time analysis
          </p>
        </div>
      )}
    </div>
  )
}

