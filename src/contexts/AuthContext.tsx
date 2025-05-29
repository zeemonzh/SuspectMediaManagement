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
      
      // Validate invitation key for admin accounts
      if (role === 'admin') {
        if (!invitationKey) {
          return { error: 'Invitation key is required for admin accounts' }
        }

        console.log('Validating admin invitation key:', invitationKey)
        
        // Check if invitation key is valid and unused
        const { data: invitation, error: inviteError } = await supabase
          .from('admin_invitations')
          .select('*')
          .eq('invitation_key', invitationKey)
          .eq('is_used', false)
          .single()

        if (inviteError || !invitation) {
          console.error('Invalid invitation key:', inviteError)
          return { error: 'Invalid or expired invitation key' }
        }

        // Check if key has expired
        if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
          return { error: 'Invitation key has expired' }
        }

        console.log('Invitation key validated successfully')
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error('Signup auth error:', error)
        return { error: error.message }
      }

      console.log('Auth signup successful, user:', data.user?.id)

      // Create streamer record for both roles
      if (data.user) {
        console.log('Creating database record...')
        const { error: streamerError } = await supabase
          .from('streamers')
          .insert({
            user_id: data.user.id,
            username: username || email.split('@')[0], // Use provided username or fallback to email
            tiktok_username: role === 'streamer' ? (tiktokUsername || '') : null,
            email: email,
            role: role,
            is_active: true
          })

        if (streamerError) {
          console.error('Error creating user record:', streamerError)
          return { error: 'Failed to create user profile: ' + streamerError.message }
        } else {
          console.log('Database record created successfully')
          
          // Mark invitation key as used for admin accounts
          if (role === 'admin' && invitationKey) {
            console.log('Marking invitation key as used...')
            try {
              const response = await fetch('/api/admin/invitation-keys/use', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  invitation_key: invitationKey,
                  used_by: data.user.id
                })
              })
              
              if (!response.ok) {
                const errorData = await response.json()
                console.error('Error marking invitation key as used:', errorData.error)
                // Don't fail registration for this, just log it
              } else {
                console.log('Invitation key marked as used successfully')
              }
            } catch (updateError) {
              console.error('Error updating invitation key:', updateError)
              // Don't fail registration for this, just log it
            }
          }
        }
      }

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