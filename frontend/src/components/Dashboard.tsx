'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import PortfolioView from './PortfolioView'
import TradingView from './TradingView'
import QuantAnalysis from './QuantAnalysis'
import QuantTradingPanel from './QuantTradingPanel'
import AccountSummary from './AccountSummary'
import AddFunds from './AddFunds'
import NewsSentimentView from './NewsSentimentView'
import PortfolioPerformance from './PortfolioPerformance'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'portfolio' | 'trading' | 'quant-panel' | 'analysis' | 'news' | 'performance' | 'add-funds' | 'account'>('performance')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Market Whisperer</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {user?.role?.toUpperCase() || 'INVESTOR'}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'performance', label: 'Performance' },
              { id: 'portfolio', label: 'Portfolio' },
              { id: 'trading', label: 'Trading' },
              { id: 'quant-panel', label: 'Quant Panel' },
              { id: 'analysis', label: 'Analysis' },
              { id: 'news', label: 'News & Sentiment' },
              { id: 'add-funds', label: 'Add Funds' },
              { id: 'account', label: 'Account' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'performance' && <PortfolioPerformance />}
        {activeTab === 'portfolio' && <PortfolioView />}
        {activeTab === 'trading' && <TradingView />}
        {activeTab === 'quant-panel' && <QuantTradingPanel />}
        {activeTab === 'analysis' && <QuantAnalysis />}
        {activeTab === 'news' && <NewsSentimentView />}
        {activeTab === 'add-funds' && <AddFunds />}
        {activeTab === 'account' && <AccountSummary />}
      </main>
    </div>
  )
}

