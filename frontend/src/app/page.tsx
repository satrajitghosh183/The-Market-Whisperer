'use client'

import { useState, useEffect } from 'react'
import Dashboard from '@/components/Dashboard'
import LoginForm from '@/components/LoginForm'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

function AppContent() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
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

