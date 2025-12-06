'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_URL } from '@/config/api'

interface ResetPasswordProps {
  onBack?: () => void
}

export default function ResetPassword({ onBack }: ResetPasswordProps) {
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)

  useEffect(() => {
    // Get token from URL or state
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const urlToken = urlParams.get('token')
      if (urlToken) {
        setToken(urlToken)
        verifyToken(urlToken)
      } else {
        setVerifying(false)
      }
    }
  }, [])

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/verify-reset-token/${tokenToVerify}`)
      setTokenValid(response.data.valid)
    } catch (err) {
      setTokenValid(false)
    } finally {
      setVerifying(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (!token) {
      setError('Reset token is required')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        newPassword
      })

      if (response.data.success) {
        setSuccess(true)
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
          <div className="text-xl">Verifying reset token...</div>
        </div>
      </div>
    )
  }

  if (!tokenValid && token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
            Market Whisperer
          </h1>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Invalid or expired reset token. Please request a new password reset.
          </div>
          {onBack ? (
            <button
              onClick={onBack}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Back to Login
            </button>
          ) : (
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Go to Login
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Market Whisperer
        </h1>
        <h2 className="text-xl text-center mb-6 text-gray-600">
          Reset Password
        </h2>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              Password has been reset successfully! Redirecting to login...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!token && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reset Token
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  placeholder="Paste your reset token here"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                Back to Login
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

