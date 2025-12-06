'use client'

import { useState, useEffect } from 'react'
import Dashboard from '@/components/Dashboard'
import LoginForm from '@/components/LoginForm'
import ResetPassword from '@/components/ResetPassword'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

function AppContent() {
  const { user, loading } = useAuth()
  const [showResetPassword, setShowResetPassword] = useState(false)
  
  useEffect(() => {
    // Check if there's a reset token in URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      if (token) {
        setShowResetPassword(true)
      }
    }
  }, [])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }
  
  if (showResetPassword) {
    return <ResetPassword />
  }
  
  if (!user) {
    return <LoginForm />
  }
  
  return <Dashboard />
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

