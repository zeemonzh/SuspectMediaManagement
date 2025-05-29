'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Streamer } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  streamer: Streamer | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, role: 'admin' | 'streamer', username?: string, invitationKey?: string, tiktokUsername?: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [streamer, setStreamer] = useState<Streamer | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()
  
  // Track if registration completion is in progress to prevent race conditions
  const completingRegistration = useRef<Set<string>>(new Set())

  useEffect(() => {
    let isMounted = true

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchStreamerData(session.user.id)
        } else {
          setStreamer(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchStreamerData = async (userId: string) => {
    try {
      const response = await fetch(`/api/auth/streamer?user_id=${userId}`)
      const result = await response.json()

      if (result.streamer) {
        setStreamer(result.streamer)
      } else {
        // Check if completion is already in progress for this user
        if (completingRegistration.current.has(userId)) {
          console.log('Registration completion already in progress for user:', userId)
          return
        }
        
        // If no streamer profile exists, try to complete registration
        console.log('No streamer profile found, attempting to complete registration...')
        
        // Mark completion as in progress
        completingRegistration.current.add(userId)
        
        try {
          const completeResponse = await fetch('/api/auth/complete-registration', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId })
          })
          
          const completeResult = await completeResponse.json()
          
          if (completeResponse.ok && completeResult.success) {
            console.log('Registration completed successfully')
            // Retry fetching the streamer data
            const retryResponse = await fetch(`/api/auth/streamer?user_id=${userId}`)
            const retryResult = await retryResponse.json()
            
            if (retryResult.streamer) {
              setStreamer(retryResult.streamer)
            } else {
              setStreamer(null)
            }
          } else {
            console.log('Could not complete registration:', completeResult.error)
            setStreamer(null)
          }
        } finally {
          // Always remove from progress tracking
          completingRegistration.current.delete(userId)
        }
      }
    } catch (error) {
      console.error('Error fetching streamer data:', error)
      setStreamer(null)
      // Clean up progress tracking on error
      completingRegistration.current.delete(userId)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const signUp = async (email: string, password: string, role: 'admin' | 'streamer', username?: string, invitationKey?: string, tiktokUsername?: string) => {
    try {
      console.log('Starting signup for:', email, 'as role:', role, 'with username:', username)
      
      // Use the registration API endpoint instead of direct Supabase calls
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          role,
          username,
          invitationKey,
          tiktokUsername
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Registration API error:', result.error)
        return { error: result.error || 'Registration failed' }
      }

      console.log('Registration successful:', result.message)
      return {}

    } catch (error) {
      console.error('Signup general error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    try {
      console.log('Starting sign out process...')
      
      // Try the main Supabase logout first
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.warn('Supabase logout warning:', error.message)
        // Don't throw on logout errors - proceed with cleanup
      }
      
      // Call our logout API as a fallback to ensure server-side cleanup
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      } catch (apiError) {
        console.warn('Logout API call failed (non-critical):', apiError)
        // This is non-critical - the main logout already happened
      }
      
      // Clear local state regardless of API errors
      setUser(null)
      setStreamer(null)
      
      console.log('Sign out completed successfully')
    } catch (error) {
      console.error('Error during sign out:', error)
      // Even if there's an error, clear the local state
      setUser(null)
      setStreamer(null)
    }
  }

  const isAdmin = streamer?.role === 'admin'

  const value = {
    user,
    streamer,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 