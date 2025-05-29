import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get total streamers (excluding admins) - EXACT same query as /api/streamers
    const { data: streamers, error: streamersError } = await supabase
      .from('streamers')
      .select(`
        *,
        stream_sessions!left(
          duration_minutes,
          average_viewers,
          payout_amount
        ),
        payout_requests!left(
          requested_amount,
          status
        )
      `)
      .eq('role', 'streamer')
      .order('created_at', { ascending: false })

    if (streamersError) throw streamersError

    const totalStreamers = streamers?.length || 0

    // Get active streams (started today, no end time)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: activeStreams } = await supabase
      .from('stream_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', today.toISOString())
      .is('end_time', null)

    // Get pending payout requests
    const { count: pendingPayouts } = await supabase
      .from('payout_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Get pending key requests
    const { count: pendingKeyRequests } = await supabase
      .from('key_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Get total hours this week
    const thisWeek = new Date()
    // Set to start of this week (Monday)
    const dayOfWeek = thisWeek.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // If Sunday, go back 6 days, otherwise go back to Monday
    thisWeek.setDate(thisWeek.getDate() - daysToMonday)
    thisWeek.setHours(0, 0, 0, 0)
    
    const { data: weekSessions } = await supabase
      .from('stream_sessions')
      .select('duration_minutes')
      .gte('start_time', thisWeek.toISOString())
      .not('duration_minutes', 'is', null)

    const totalMinutes = weekSessions?.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) || 0
    const totalHours = Math.round(totalMinutes / 60)

    // Get average viewers this week
    const { data: viewerSessions } = await supabase
      .from('stream_sessions')
      .select('average_viewers, total_viewers')
      .gte('start_time', thisWeek.toISOString())
      .not('average_viewers', 'is', null)

    let avgViewers = 0
    if (viewerSessions?.length) {
      const totalViewers = viewerSessions.reduce((sum, session) => sum + (session.total_viewers || session.average_viewers || 0), 0)
      avgViewers = Math.round(totalViewers / viewerSessions.length)
    }

    // Add cache-control headers to prevent stale data
    const headers = new Headers({
      'Cache-Control': 'no-store, must-revalidate',
      'Pragma': 'no-cache'
    })

    return NextResponse.json({
      totalStreamers: totalStreamers || 0,
      activeStreams: activeStreams || 0,
      pendingPayouts: pendingPayouts || 0,
      pendingKeyRequests: pendingKeyRequests || 0,
      totalHours,
      avgViewers
    }, { headers })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
} 