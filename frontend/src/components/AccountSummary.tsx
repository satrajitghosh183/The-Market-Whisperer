'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'

interface Wallet {
  walletId: string
  availableBalance: number
  lockedBalance: number
}

interface User {
  userId: string
  email: string
  role: string
  mode: string
  riskProfile?: string
  horizonYears?: number
}

export default function AccountSummary() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchAccountData()
    }
  }, [user])

  const fetchAccountData = async () => {
    try {
      const [profileRes, portfoliosRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile/${user?.userId}`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/user/${user?.userId}`)
      ])
      
      setProfile(profileRes.data.user)
      setWallet(profileRes.data.wallet)
    } catch (error) {
      console.error('Error fetching account data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading account information...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Account Summary</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wallet Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Wallet</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Available Balance:</span>
              <span className="font-semibold text-green-600">
                ${wallet?.availableBalance?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Locked Balance:</span>
              <span className="font-semibold text-yellow-600">
                ${wallet?.lockedBalance?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t">
              <span className="text-gray-700 font-semibold">Total:</span>
              <span className="font-bold text-lg text-gray-900">
                ${((wallet?.availableBalance || 0) + (wallet?.lockedBalance || 0)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Profile</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{profile?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Role:</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                {profile?.role?.toUpperCase() || 'INVESTOR'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mode:</span>
              <span className="font-medium">{profile?.mode || 'investor'}</span>
            </div>
            {profile?.riskProfile && (
              <div className="flex justify-between">
                <span className="text-gray-600">Risk Profile:</span>
                <span className="font-medium capitalize">{profile.riskProfile}</span>
              </div>
            )}
            {profile?.horizonYears && (
              <div className="flex justify-between">
                <span className="text-gray-600">Investment Horizon:</span>
                <span className="font-medium">{profile.horizonYears} years</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

