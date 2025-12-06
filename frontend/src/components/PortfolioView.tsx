'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import PortfolioChart from './PortfolioChart'

interface Position {
  positionId: string
  ticker: string
  shares: number
  avgCost: number
  currentPrice?: number
  unrealizedPnL?: number
}

interface Portfolio {
  portfolioId: string
  userId: string
  benchmark: string
  holdings: string[]
  targetWeights: Record<string, number>
  positions?: Position[]
  totalValue?: number
  unrealizedPnL?: number
}

export default function PortfolioView() {
  const { user } = useAuth()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (user) {
      fetchPortfolio()
      // Set up auto-refresh every 10 seconds
      refreshIntervalRef.current = setInterval(() => {
        fetchPortfolio()
      }, 10000)
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [user])

  const fetchPortfolio = async () => {
    if (!user?.userId) return
    
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/user/${user.userId}`
      )
      if (response.data.length > 0) {
        const portfolioData = response.data[0]
        setPortfolio(portfolioData)
        
        // Set up WebSocket connection for real-time updates if portfolio exists
        if (portfolioData.portfolioId && !wsRef.current) {
          setupWebSocket(portfolioData.portfolioId, user.userId, portfolioData.positions)
        }
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupWebSocket = (portfolioId: string, userId: string, positions?: Position[]) => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
    const ws = new WebSocket(`${wsUrl}/ws`)
    
    ws.onopen = () => {
      console.log('WebSocket connected for portfolio updates')
      // Subscribe to portfolio updates
      ws.send(JSON.stringify({
        type: 'subscribe_portfolio',
        payload: { portfolioId, userId }
      }))
      
      // Subscribe to all tickers in portfolio
      if (positions && positions.length > 0) {
        positions.forEach(position => {
          ws.send(JSON.stringify({
            type: 'subscribe_ticker',
            payload: { ticker: position.ticker }
          }))
        })
      }
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'portfolio_update') {
          setPortfolio(data.portfolio)
        } else if (data.type === 'ticker_update' && portfolio) {
          // Update position price when ticker updates
          setPortfolio(prev => {
            if (!prev) return prev
            const updatedPositions = prev.positions?.map(pos => {
              if (pos.ticker === data.ticker) {
                const currentPrice = data.price || pos.avgCost
                const currentValue = pos.shares * currentPrice
                const costBasis = pos.shares * pos.avgCost
                const unrealizedPnL = currentValue - costBasis
                
                return {
                  ...pos,
                  currentPrice,
                  unrealizedPnL
                }
              }
              return pos
            }) || []
            
            const totalValue = updatedPositions.reduce((sum, pos) => {
              const price = pos.currentPrice || pos.avgCost
              return sum + (pos.shares * price)
            }, 0)
            
            const unrealizedPnL = updatedPositions.reduce((sum, pos) => {
              return sum + (pos.unrealizedPnL || 0)
            }, 0)
            
            return {
              ...prev,
              positions: updatedPositions,
              totalValue,
              unrealizedPnL
            }
          })
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...')
      wsRef.current = null
      // Reconnect after 3 seconds
      setTimeout(() => {
        setPortfolio(current => {
          if (current?.portfolioId && user?.userId) {
            setupWebSocket(current.portfolioId, user.userId, current.positions)
          }
          return current
        })
      }, 3000)
    }
    
    wsRef.current = ws
  }

  const generatePortfolio = async () => {
    setGenerating(true)
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/generate`,
        {
          userId: user?.userId,
          numStocks: 20,
          benchmark: 'SPY'
        }
      )
      setPortfolio(response.data.portfolio)
      alert('Portfolio generated successfully!')
    } catch (error) {
      console.error('Error generating portfolio:', error)
      alert('Failed to generate portfolio')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading portfolio...</div>
  }

  if (!portfolio) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">No portfolio found. Generate one to get started.</p>
        <button
          onClick={generatePortfolio}
          disabled={generating}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate Portfolio'}
        </button>
      </div>
    )
  }

  const positions = portfolio.positions || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Portfolio</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchPortfolio}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
            title="Refresh portfolio data"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={generatePortfolio}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {generating ? 'Regenerating...' : 'Regenerate Portfolio'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Value</h3>
          <p className="text-2xl font-bold text-gray-900">
            ${portfolio.totalValue?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Unrealized P&L</h3>
          <p className={`text-2xl font-bold ${
            (portfolio.unrealizedPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            ${portfolio.unrealizedPnL?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Positions</h3>
          <p className="text-2xl font-bold text-gray-900">{positions.length}</p>
        </div>
      </div>

      {/* Portfolio Chart */}
      {positions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Holdings Distribution</h3>
          <PortfolioChart positions={positions} />
        </div>
      )}

      {/* Positions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700">Positions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticker</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shares</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P&L</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No positions yet
                  </td>
                </tr>
              ) : (
                positions.map((position) => {
                  const currentPrice = position.currentPrice || position.avgCost
                  const value = position.shares * currentPrice
                  const pnl = position.unrealizedPnL || 0
                  
                  return (
                    <tr key={position.positionId}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{position.ticker}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{position.shares}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${position.avgCost.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${currentPrice.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${value.toFixed(2)}</td>
                      <td className={`px-6 py-4 whitespace-nowrap ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${pnl.toFixed(2)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

