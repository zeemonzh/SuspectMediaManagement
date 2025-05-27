'use client'

import { createContext, useContext, useEffect, useState } from 'react'
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
    // Get initial session
    const getSession = async () => {
      try {
        console.log('Getting initial session...')
        const { data: { session } } = await supabase.auth.getSession()
        console.log('Session result:', session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchStreamerData(session.user.id)
        }
        
        console.log('Setting loading to false')
        setLoading(false)
      } catch (error) {
        console.error('Error in getSession:', error)
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchStreamerData(session.user.id)
        } else {
          setStreamer(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchStreamerData = async (userId: string) => {
    try {
      console.log('Fetching streamer data for user:', userId)
      const { data, error } = await supabase
        .from('streamers')
        .select('*')
        .eq('user_id', userId)
        .single()

      console.log('Streamer query result:', { data, error })

      if (!error && data) {
        setStreamer(data)
      } else {
        console.log('No streamer record found or error occurred')
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
            tiktok_username: role === 'streamer' ? (tiktokUsername || '') : 'N/A',
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
            const { error: updateError } = await supabase
              .from('admin_invitations')
              .update({
                used_by: data.user.id,
                is_used: true,
                used_at: new Date().toISOString()
              })
              .eq('invitation_key', invitationKey)
            
            if (updateError) {
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