import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
export interface Streamer {
  id: string
  username: string
  tiktok_username: string
  email: string
  created_at: string
  updated_at: string
  is_active: boolean
  user_id?: string // Link to Supabase auth user
  role: 'admin' | 'streamer'
  paypal_username?: string
}

export interface StreamSession {
  id: string
  streamer_id: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  peak_viewers: number
  average_viewers: number
  total_likes: number
  created_at: string
}

export interface Goal {
  id: string
  streamer_id: string
  month: string
  target_hours: number
  target_viewers: number
  current_hours: number
  current_avg_viewers: number
  is_completed: boolean
  created_at: string
}

export interface Payout {
  id: string
  streamer_id: string
  amount: number
  month: string
  status: 'pending' | 'paid'
  calculated_amount: number
  admin_notes?: string
  paid_at?: string
  created_at: string
}

export interface ProductKey {
  id: string
  key_value: string
  is_used: boolean
  used_by_streamer_id?: string
  used_at?: string
  created_at: string
}

export interface KeyRequest {
  id: string
  streamer_id: string
  reason: string
  status: 'pending' | 'approved' | 'denied'
  admin_response?: string
  created_at: string
}

// Browser client for client-side operations
export const createSupabaseBrowserClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Server client for server-side operations
export const createSupabaseServerClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 