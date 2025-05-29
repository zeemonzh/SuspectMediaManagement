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

    // Get total hours from all completed sessions
    const { data: completedSessions } = await supabase
      .from('stream_sessions')
      .select('duration_minutes')
      .not('duration_minutes', 'is', null)

    const totalMinutes = completedSessions?.reduce((sum, session) => 
      sum + (session.duration_minutes || 0), 0) || 0
    const totalHours = Math.round(totalMinutes / 60)

    // Get average viewers across all sessions
    const { data: viewerSessions } = await supabase
      .from('stream_sessions')
      .select('average_viewers')
      .not('average_viewers', 'is', null)

    const avgViewers = viewerSessions?.length 
      ? Math.round(viewerSessions.reduce((sum, session) => 
          sum + (session.average_viewers || 0), 0) / viewerSessions.length)
      : 0

    // Get total payouts from stream sessions
    const { data: payoutSessions } = await supabase
      .from('stream_sessions')
      .select('payout_amount')
      .not('payout_amount', 'is', null)

    const totalPayouts = payoutSessions?.reduce((sum, session) => 
      sum + (session.payout_amount || 0), 0) || 0

    return NextResponse.json({
      totalSessions: totalSessions || 0,
      activeSessions: activeSessions || 0,
      totalHours,
      avgViewers,
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