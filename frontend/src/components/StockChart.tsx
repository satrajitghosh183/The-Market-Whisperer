'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface StockData {
  date: string
  close: number
  open: number
  high: number
  low: number
  volume: number
}

export default function StockChart({ ticker }: { ticker: string }) {
  const [data, setData] = useState<StockData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (ticker) {
      fetchStockData()
    }
  }, [ticker])

  const fetchStockData = async () => {
    setLoading(true)
    setError('')
    try {
      // Fetch all historical data, not just last 100 points
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/quant/data/${ticker}`
      )
      
      if (response.data.error) {
        setError(response.data.error)
        setData([])
        return
      }
      
      if (!response.data.data || response.data.data.length === 0) {
        setError(`No historical data available for ${ticker}`)
        setData([])
        return
      }
      
      // Format data for chart - show all available data, not just last 100
      const chartData = response.data.data.map((item: any, index: number) => {
        // Try to parse date - could be YYYYMMDD format or ISO string
        let dateStr = item.date;
        let formattedDate = `Day ${index + 1}`;
        
        if (dateStr) {
          // Handle YYYYMMDD format
          if (typeof dateStr === 'string' && dateStr.length === 8 && !isNaN(Number(dateStr))) {
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            dateStr = `${year}-${month}-${day}`;
          }
          
          // Try to parse as date
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              // Format as M/D/YYYY for better readability
              formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
            }
          } catch (e) {
            // Keep default format
          }
        }
        
        return {
          date: formattedDate,
          dateValue: dateStr || `Day ${index + 1}`, // For sorting
          close: parseFloat(item.close) || 0,
          open: parseFloat(item.open) || 0,
          high: parseFloat(item.high) || 0,
          low: parseFloat(item.low) || 0,
          volume: parseInt(item.volume) || 0
        };
      }).sort((a: any, b: any) => {
        // Sort by date if available, otherwise by index
        if (a.dateValue && b.dateValue && a.dateValue !== b.dateValue) {
          return new Date(a.dateValue).getTime() - new Date(b.dateValue).getTime();
        }
        return 0;
      })
      
      setData(chartData)
    } catch (err: any) {
      console.error('Error fetching stock data:', err)
      setError(err.response?.data?.error || `Failed to load historical data for ${ticker}`)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading chart data...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">{error}</div>
        <div className="text-sm text-gray-500">Please try a different ticker from the available list.</div>
      </div>
    )
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available for {ticker}</div>
  }

  return (
    <div>
      <div className="mb-2 text-sm text-gray-600">
        Showing {data.length} data points (Historical OHLCV data)
      </div>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={data.length > 30 ? Math.floor(data.length / 12) : 0}
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Tooltip 
              formatter={(value: number) => `$${value.toFixed(2)}`}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke="#0088FE" 
              strokeWidth={2}
              name="Close Price"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="high" 
              stroke="#82ca9d" 
              strokeWidth={1}
              name="High"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="low" 
              stroke="#ff7300" 
              strokeWidth={1}
              name="Low"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="open" 
              stroke="#8884d8" 
              strokeWidth={1}
              name="Open"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

