'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, streamer, loading } = useAuth()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    // Don't make redirect decisions until auth is no longer loading
    if (loading) return
    
    // Small delay to ensure auth state is settled
    const timer = setTimeout(() => {
      if (user) {
        setRedirecting(true)
        
        if (streamer) {
          if (streamer.role === 'admin') {
            router.push('/admin')
          } else {
            router.push('/streamer')
          }
        } else {
          // User exists but no streamer record - redirect to setup
          router.push('/setup')
        }
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [user, streamer, loading, router])

  // Show loading during auth initialization or redirect
  if (loading || redirecting) {
    return (
      <div className="min-h-screen bg-suspect-body flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-suspect-text animate-pulse-slow">
            SuspectCheats
          </div>
          <div className="text-suspect-gray-400 mt-2 animate-dots">
            {redirecting ? 'Redirecting...' : 'Loading...'}
          </div>
        </div>
      </div>
    )
  }

  // Show login prompt for unauthenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-suspect-body flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-8 animate-fade-in-up">
          <div className="animate-slide-in-left">
            <h1 className="text-4xl font-bold text-suspect-text mb-4 animate-float">
              SuspectCheats
            </h1>
            <p className="text-suspect-gray-400 mb-8">
              Streamer management platform
            </p>
          </div>
          
          <div className="space-y-4 animate-slide-in-right">
            <Link href="/login" className="btn-primary w-full block hover:shadow-lg hover:shadow-suspect-primary/20">
              Sign In
            </Link>
            <Link href="/register" className="btn-secondary w-full block hover:shadow-lg hover:shadow-suspect-gray-500/20">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // This should never render since authenticated users are redirected above
  return null
} 