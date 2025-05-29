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
        setStreamer(null)
      }
    } catch (error) {
      console.error('Error fetching streamer data:', error)
      setStreamer(null)
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
      
      // Use the registration API endpoint instead of direct database insertion
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
        return { error: result.error }
      }

      console.log('Registration successful:', result.message)

      // Now sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error('Sign in after registration failed:', signInError)
        return { error: 'Account created but sign in failed: ' + signInError.message }
      }

      return {}
    } catch (error) {
      console.error('Signup general error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    try {
      console.log('Signing out...')
      await supabase.auth.signOut()
      console.log('Sign out successful')
    } catch (error) {
      console.error('Error signing out:', error)
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