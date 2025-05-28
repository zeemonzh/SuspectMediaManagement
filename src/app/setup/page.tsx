'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function SetupPage() {
  const { user, streamer, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If we have both user and streamer, redirect to appropriate dashboard
    if (user && streamer) {
      if (streamer.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/streamer')
      }
    }
  }, [user, streamer, router])

  const handleRelogin = async () => {
    await signOut()
    router.push('/login')
  }

  if (loading) {
    return <LoadingSpinner fullScreen text="Checking setup status" />
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-suspect-body flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-suspect-text mb-4">Account Setup Required</h1>
          <p className="text-suspect-gray-400 mb-6">
            Your account needs to be properly configured. This usually happens during registration.
          </p>
        </div>
        
        <div className="bg-yellow-900/20 border border-yellow-500 text-yellow-300 px-4 py-3 rounded">
          <p className="text-sm">
            Your user account exists but is missing required profile information. 
            Please contact support or try logging in again.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleRelogin}
            className="btn-primary w-full"
          >
            Sign In Again
          </button>
          
          <Link href="/register" className="btn-secondary w-full block">
            Create New Account
          </Link>
        </div>
        
        <div className="text-center">
          <p className="text-suspect-gray-400 text-sm">
            Need help? Contact support at{' '}
            <a href="mailto:support@suspectcheats.com" className="text-suspect-primary hover:text-suspect-primary/80">
              support@suspectcheats.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
} 