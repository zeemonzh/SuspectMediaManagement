import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const streamerId = params.id

    // Get streamer basic info
    const { data: streamer, error: streamerError } = await supabase
      .from('streamers')
      .select('*')
      .eq('id', streamerId)
      .single()

    if (streamerError) throw streamerError

    // Get stream sessions for this streamer
    const { data: sessions, error: sessionsError } = await supabase
      .from('stream_sessions')
      .select('*')
      .eq('streamer_id', streamerId)
      .order('start_time', { ascending: false })

    if (sessionsError) throw sessionsError

    // Calculate stats
    const totalStreams = sessions.length
    const totalHours = sessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) / 60
    const avgViewers = sessions.length > 0 
      ? Math.round(sessions.reduce((sum, session) => sum + (session.average_viewers || 0), 0) / sessions.length)
      : 0

    // Get current month's data
    const currentMonth = new Date().toISOString().substring(0, 7)
    const currentMonthSessions = sessions.filter(session => 
      session.start_time.startsWith(currentMonth)
    )
    const currentMonthHours = currentMonthSessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) / 60

    // Get current goal
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('streamer_id', streamerId)
      .eq('month', currentMonth)
      .single()

    // Get current month's payout status
    const { data: currentPayout, error: payoutError } = await supabase
      .from('payout_requests')
      .select('status, requested_amount')
      .eq('streamer_id', streamerId)
      .eq('month', currentMonth)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Determine payout status and amount
    let payoutStatus = 'no_request'
    let currentPayoutAmount = 0

    if (currentPayout) {
      payoutStatus = currentPayout.status
      currentPayoutAmount = currentPayout.requested_amount || 0
    }

    // Get recent streams (last 5)
    const recentStreams = sessions.slice(0, 5).map(session => ({
      date: new Date(session.start_time).toISOString().split('T')[0],
      duration: `${Math.floor((session.duration_minutes || 0) / 60)}h ${(session.duration_minutes || 0) % 60}m`,
      viewers: session.peak_viewers || 0,
      likes: session.total_likes || 0
    }))

    return NextResponse.json({
      streamer,
      stats: {
        totalHours: Math.round(totalHours),
        avgViewers,
        totalStreams,
        currentMonthHours: Math.round(currentMonthHours),
        goalProgress: goal ? Math.round((goal.current_hours / goal.target_hours) * 100) : 0,
        payoutStatus: payoutStatus,
        currentPayout: currentPayoutAmount
      },
      goal: goal || {
        targetHours: 60,
        targetViewers: 2000,
        currentHours: Math.round(currentMonthHours),
        currentViewers: avgViewers
      },
      recentStreams
    })

  } catch (error) {
    console.error('Error fetching streamer stats:', error)
    return NextResponse.json({ error: 'Failed to fetch streamer stats' }, { status: 500 })
  }
} 