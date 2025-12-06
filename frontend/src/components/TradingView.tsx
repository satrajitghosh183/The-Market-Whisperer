'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'

interface Order {
  orderId: string
  ticker: string
  quantity: number
  side: string
  price: number
  status: string
  createdAt: string
}

interface StockInfo {
  ticker: string
  currentPrice?: number
  change?: number
}

export default function TradingView() {
  const { user } = useAuth()
  const [ticker, setTicker] = useState('')
  const [quantity, setQuantity] = useState(100)
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableTickers, setAvailableTickers] = useState<string[]>([])
  const [selectedStockInfo, setSelectedStockInfo] = useState<StockInfo | null>(null)
  const [loadingStockInfo, setLoadingStockInfo] = useState(false)

  useEffect(() => {
    if (user) {
      fetchOrders()
      fetchAvailableTickers()
    }
  }, [user])

  useEffect(() => {
    if (ticker) {
      fetchStockInfo()
    }
  }, [ticker])

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

  const fetchStockInfo = async () => {
    if (!ticker) return
    
    setLoadingStockInfo(true)
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/quant/data/${ticker}?limit=1`
      )
      if (response.data.data && response.data.data.length > 0) {
        const latest = response.data.data[response.data.data.length - 1]
        const previous = response.data.data.length > 1 ? response.data.data[response.data.data.length - 2] : null
        const change = previous ? latest.close - previous.close : 0
        
        setSelectedStockInfo({
          ticker: ticker.toUpperCase(),
          currentPrice: latest.close,
          change
        })
      }
    } catch (error) {
      console.error('Error fetching stock info:', error)
      setSelectedStockInfo(null)
    } finally {
      setLoadingStockInfo(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/trading/orders/${user?.userId}`
      )
      setOrders(response.data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/trading/order`, {
        userId: user?.userId,
        ticker: ticker.toUpperCase(),
        quantity,
        side,
        orderType: 'market'
      })
      
      setTicker('')
      setQuantity(100)
      await fetchOrders()
      alert('Order placed successfully!')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  const handleCoupledTrade = async () => {
    setError('')
    setLoading(true)

    try {
      // Example: long AAPL, short MSFT
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/trading/coupled`, {
        userId: user?.userId,
        longTicker: ticker.toUpperCase() || 'AAPL',
        shortTicker: 'MSFT',
        longQuantity: quantity,
        shortQuantity: quantity
      })
      
      setTicker('')
      setQuantity(100)
      await fetchOrders()
      alert('Coupled trade executed successfully!')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place coupled trade')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Trading</h2>

      {/* Order Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Place Order</h3>
        
        <form onSubmit={handlePlaceOrder} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ticker
              </label>
              <select
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select a ticker...</option>
                {availableTickers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {selectedStockInfo && (
                <div className="mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{selectedStockInfo.ticker}</span>
                    <span className="text-gray-600">
                      ${selectedStockInfo.currentPrice?.toFixed(2) || 'N/A'}
                    </span>
                    {selectedStockInfo.change !== undefined && selectedStockInfo.change !== 0 && (
                      <span className={selectedStockInfo.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ({selectedStockInfo.change >= 0 ? '+' : ''}{selectedStockInfo.change.toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              )}
              {loadingStockInfo && (
                <div className="mt-2 text-sm text-gray-500">Loading stock data...</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                required
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Side
              </label>
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 rounded-md text-white font-medium ${
                side === 'buy'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50`}
            >
              {loading ? 'Placing...' : `${side.toUpperCase()} Order`}
            </button>

            <button
              type="button"
              onClick={handleCoupledTrade}
              disabled={loading || !ticker}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              Coupled Trade (Hedged)
            </button>
          </div>
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticker</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Side</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No orders yet
                  </td>
                </tr>
              ) : (
                orders
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((order) => (
                    <tr key={order.orderId}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{order.ticker}</td>
                      <td className={`px-6 py-4 whitespace-nowrap ${
                        order.side === 'buy' ? 'text-green-600' : 'text-red-600'
                      } font-medium`}>
                        {order.side.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{order.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${order.price.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          order.status === 'filled' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

