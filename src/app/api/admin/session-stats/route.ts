import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Prevent route caching
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get total sessions count
    const { count: totalSessions } = await supabase
      .from('stream_sessions')
      .select('*', { count: 'exact', head: true })

    // Get active sessions count (no end_time)
    const { count: activeSessions } = await supabase
      .from('stream_sessions')
      .select('*', { count: 'exact', head: true })
      .is('end_time', null)

    // Get total hours from all sessions (both completed and live)
    const { data: allSessions } = await supabase
      .from('stream_sessions')
      .select('duration_minutes, start_time, end_time, total_viewers')

    const totalMinutes = allSessions?.reduce((sum, session) => {
      if (session.duration_minutes) {
        // For completed sessions, use the stored duration
        return sum + session.duration_minutes
      } else if (!session.end_time && session.start_time) {
        // For live sessions, calculate current duration
        const start = new Date(session.start_time)
        const now = new Date()
        const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60))
        return sum + diffMinutes
      }
      return sum
    }, 0) || 0

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10

    // Calculate total views across all sessions
    const totalViews = allSessions?.reduce((sum, session) => 
      sum + (session.total_viewers || 0), 0) || 0

    // Get total payouts from stream sessions
    const { data: payoutSessions } = await supabase
      .from('stream_sessions')
      .select('payout_amount')
      .not('payout_amount', 'is', null)

    const totalPayouts = Math.round((payoutSessions || []).reduce((sum, session) => 
      sum + (session.payout_amount || 0), 0) * 100) / 100

    return NextResponse.json({
      totalSessions: totalSessions || 0,
      activeSessions: activeSessions || 0,
      totalHours,
      totalViews,
      totalPayouts
    })

  } catch (error) {
    console.error('Error fetching session stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session stats' },
      { status: 500 }
    )
  }
} 