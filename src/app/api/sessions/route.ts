import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface StreamSession {
  id: string
  streamer_id: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  total_viewers?: number
  peak_viewers?: number
  payout_amount?: number
  admin_notes?: string
  streamers: {
    username: string
    tiktok_username: string
  }
  is_live: boolean
}

export async function GET(request: NextRequest) {
  try {
    // Get all stream sessions with streamer info
    const { data: sessions, error } = await supabase
      .from('stream_sessions')
      .select(`
        *,
        streamers (
          username,
          tiktok_username
        )
      `)
      .order('start_time', { ascending: false })

    if (error) throw error

    // Initialize sessions array if null
    const safeSessions = sessions || []

    // Calculate stats
    const totalSessions = safeSessions.length
    const activeSessions = safeSessions.filter((s: StreamSession) => !s.end_time).length
    const totalHours = Math.round(safeSessions.reduce((sum: number, s: StreamSession) => sum + (s.duration_minutes || 0), 0) / 60)
    const totalViews = safeSessions.reduce((sum: number, s: StreamSession) => sum + (s.total_viewers || 0), 0)
    const totalPayouts = Math.round(safeSessions.reduce((sum: number, s: StreamSession) => sum + (s.payout_amount || 0), 0) * 100) / 100

    const stats = {
      totalSessions,
      activeSessions,
      totalHours,
      totalViews,
      totalPayouts
    }

    return NextResponse.json({
      sessions: safeSessions,
      stats
    })

  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
} 