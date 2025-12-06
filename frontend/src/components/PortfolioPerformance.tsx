'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { API_URL } from '@/config/api';

interface PerformanceData {
  timestamp: string;
  value: number;
  totalPnL: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

interface CurrentPerformance {
  totalPortfolioValue: number;
  totalPnL: number;
  unrealizedPnL: number;
  realizedPnL: number;
  dailyChange: number;
  dailyChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  cashBalance: number;
  totalValue: number;
  timestamp?: string;
}

export default function PortfolioPerformance() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [performance, setPerformance] = useState<CurrentPerformance | null>(null);
  const [history, setHistory] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      fetchPortfolio().then(() => {
        // Only start fetching performance after portfolio is loaded
        fetchPerformance();
        
        // Auto-refresh every 5 seconds to sync with PortfolioView
        refreshIntervalRef.current = setInterval(() => {
          // Refresh portfolio first, then performance
          fetchPortfolio().then(() => {
            fetchPerformance();
          });
        }, 5000);
      });
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [user, timeRange]);

  const fetchPortfolio = async () => {
    if (!user?.userId) return;
    
    try {
      const response = await axios.get(
        `${API_URL}/api/portfolio/user/${user.userId}`
      );
      if (response.data.length > 0) {
        setPortfolio(response.data[0]);
      } else {
        // No portfolio yet, set loading to false
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }

    if (!portfolio?.portfolioId) {
      setLoading(false);
      return;
    }

    try {
      // Use the same portfolio endpoint as PortfolioView to ensure consistency
      const portfolioResponse = await axios.get(
        `${API_URL}/api/portfolio/${portfolio.portfolioId}`
      );

      if (portfolioResponse.data) {
        const portfolioData = portfolioResponse.data;
        const walletResponse = await axios.get(
          `${API_URL}/api/payment/wallet/${user.userId}`
        );
        const cashBalance = walletResponse.data?.wallet?.availableBalance || 0;

        // Calculate performance metrics from portfolio data (same as PortfolioView)
        const totalPortfolioValue = portfolioData.totalValue || 0;
        const unrealizedPnL = portfolioData.unrealizedPnL || 0;
        const realizedPnL = portfolioData.positions?.reduce((sum: number, pos: any) => 
          sum + (pos.realizedPnL || 0), 0) || 0;
        const totalPnL = unrealizedPnL + realizedPnL;

        // Get history for chart
        const days = getDaysForRange(timeRange);
        let historyData: any[] = [];
        try {
          const historyResponse = await axios.get(
            `${API_URL}/api/performance/history/${portfolio.portfolioId}`,
            { params: { userId: user.userId, days } }
          );
          if (historyResponse.data.success) {
            historyData = historyResponse.data.history;
          }
        } catch (historyError) {
          console.warn('Could not fetch history, using empty array:', historyError);
        }

        // Calculate daily change from history
        const yesterday = historyData.length > 1 ? historyData[historyData.length - 2] : null;
        const dailyChange = yesterday 
          ? totalPortfolioValue - (yesterday.value || yesterday.totalPortfolioValue || totalPortfolioValue)
          : 0;
        const dailyChangePercent = yesterday && (yesterday.value || yesterday.totalPortfolioValue) > 0
          ? (dailyChange / (yesterday.value || yesterday.totalPortfolioValue)) * 100
          : 0;

        // Calculate total return
        const initialValue = historyData.length > 0 
          ? (historyData[0].value || historyData[0].totalPortfolioValue || totalPortfolioValue)
          : totalPortfolioValue;
        const totalReturn = totalPortfolioValue - initialValue;
        const totalReturnPercent = initialValue > 0
          ? (totalReturn / initialValue) * 100
          : 0;

        setPerformance({
          totalPortfolioValue,
          cashBalance,
          unrealizedPnL,
          realizedPnL,
          totalPnL,
          dailyChange,
          dailyChangePercent,
          totalReturn,
          totalReturnPercent,
          totalValue: totalPortfolioValue, // Add missing totalValue property
          timestamp: new Date().toISOString()
        });

        // Format history data for chart
        const formattedHistory = formatHistoryData(historyData);
        setHistory(formattedHistory);
      }
    } catch (error: any) {
      console.error('Error fetching performance:', error);
      // If error, still set loading to false and show what we can
      if (error?.response?.status === 404 || error?.response?.status === 400) {
        // Portfolio might not exist yet
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const getDaysForRange = (range: string): number => {
    switch (range) {
      case '1D': return 1;
      case '1W': return 7;
      case '1M': return 30;
      case '3M': return 90;
      case '1Y': return 365;
      case 'ALL': return 365 * 2;
      default: return 30;
    }
  };

  const formatHistoryData = (data: any[]): PerformanceData[] => {
    if (data.length === 0) {
      // If no history, create a single point with current value
      const currentValue = performance?.totalPortfolioValue || portfolio?.totalValue || 0;
      return [{
        timestamp: new Date().toISOString(),
        value: currentValue,
        totalPnL: performance?.totalPnL || 0,
        unrealizedPnL: performance?.unrealizedPnL || 0,
        realizedPnL: performance?.realizedPnL || 0
      }];
    }

    return data.map(item => ({
      timestamp: item.timestamp,
      value: item.value || item.totalPortfolioValue || item.totalValue || 0,
      totalPnL: item.totalPnL || 0,
      unrealizedPnL: item.unrealizedPnL || 0,
      realizedPnL: item.realizedPnL || 0
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    if (timeRange === '1D') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading && !portfolio) {
    return <div className="text-center py-8">Loading performance data...</div>;
  }

  if (!portfolio) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">No portfolio found. Create a portfolio to view performance.</p>
        <button
          onClick={() => {
            fetchPortfolio().then(() => {
              if (portfolio) fetchPerformance();
            });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
    );
  }

  if (loading && !performance) {
    return <div className="text-center py-8">Loading performance data...</div>;
  }

  const chartData = history.length > 0 ? history : formatHistoryData([]);
  const isPositive = (performance?.totalPnL || 0) >= 0;
  const isDailyPositive = (performance?.dailyChange || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Header with Portfolio Value */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">Total Portfolio Value</p>
          <h2 className="text-4xl font-bold text-gray-900">
            {formatCurrency(performance?.totalPortfolioValue || 0)}
          </h2>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Today's Change</p>
            <p className={`text-2xl font-semibold ${isDailyPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isDailyPositive ? '+' : ''}{formatCurrency(performance?.dailyChange || 0)}
              <span className="text-lg ml-2">
                ({formatPercent(performance?.dailyChangePercent || 0)})
              </span>
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Total P&L</p>
            <p className={`text-2xl font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{formatCurrency(performance?.totalPnL || 0)}
              <span className="text-lg ml-2">
                ({formatPercent(performance?.totalReturnPercent || 0)})
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Portfolio Performance</h3>
          <div className="flex gap-2">
            {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`px-3 py-1 text-sm rounded ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatDate}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => formatDate(label)}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Unrealized P&L</p>
          <p className={`text-2xl font-bold ${
            (performance?.unrealizedPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(performance?.unrealizedPnL || 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Realized P&L</p>
          <p className={`text-2xl font-bold ${
            (performance?.realizedPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(performance?.realizedPnL || 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Cash Balance</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(performance?.cashBalance || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}

