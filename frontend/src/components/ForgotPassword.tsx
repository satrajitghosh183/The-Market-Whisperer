'use client'

import { useState } from 'react'
import axios from 'axios'
import { API_URL } from '@/config/api'

interface ForgotPasswordProps {
  onBack: () => void
}

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetToken, setResetToken] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, {
        email
      })

      if (response.data.success) {
        setSuccess(true)
        // In development, show the token. In production, this would be sent via email
        if (response.data.resetToken) {
          setResetToken(response.data.resetToken)
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to request password reset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Market Whisperer
        </h1>
        <h2 className="text-xl text-center mb-6 text-gray-600">
          Forgot Password
        </h2>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {resetToken 
                ? 'Password reset token generated! Use it to reset your password.'
                : 'If an account exists with this email, a password reset link has been sent.'}
            </div>

            {resetToken && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm text-gray-700 mb-2 font-semibold">Reset Token (Development Only):</p>
                <div className="bg-white p-3 rounded border border-gray-300 break-all text-sm font-mono">
                  {resetToken}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Copy this token and use it in the reset password form, or click the link below.
                </p>
                <button
                  onClick={() => {
                    window.location.href = `/reset-password?token=${resetToken}`
                  }}
                  className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Go to Reset Password
                </button>
              </div>
            )}

            <button
              onClick={onBack}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

