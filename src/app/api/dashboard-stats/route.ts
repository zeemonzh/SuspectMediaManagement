import { NextRequest, NextResponse } from 'next/server'

// Use secure utility that avoids caching issues
const { createSupabaseServerClient } = require('../../../lib/supabase-server')

export async function GET(request: NextRequest) {
  try {
    console.log('Dashboard stats API called - using secure utility approach')
    
    const supabase = createSupabaseServerClient()
    
    // Get total streamers (using same query as working debug script)
    const { data: totalStreamersData, error: totalError } = await supabase
      .from('streamers')
      .select('*')
      .eq('role', 'streamer')

    console.log('Total streamers query result:', totalStreamersData?.length || 0, 'error:', totalError)

    // Get active streamers
    const { data: activeStreamersData, error: activeError } = await supabase
      .from('streamers')
      .select('*')
      .eq('is_active', true)
      .eq('role', 'streamer')

    console.log('Active streamers query result:', activeStreamersData?.length || 0, 'error:', activeError)

    // Get pending streamers (inactive, waiting for email confirmation)
    const { data: pendingStreamersData, error: pendingError } = await supabase
      .from('streamers')
      .select('*')
      .eq('is_active', false)
      .eq('role', 'streamer')

    console.log('Pending streamers query result:', pendingStreamersData?.length || 0, 'error:', pendingError)

    // Get active streams (started today, no end time)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data: activeStreamsData, error: streamsError } = await supabase
      .from('stream_sessions')
      .select('*')
      .gte('start_time', today.toISOString())
      .is('end_time', null)

    // Get pending payout requests
    const { data: pendingPayoutsData, error: payoutsError } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('status', 'pending')

    // Get pending key requests
    const { data: pendingKeyRequestsData, error: keyRequestsError } = await supabase
      .from('key_requests')
      .select('*')
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

    const totalMinutes = weekSessions?.reduce((sum: number, session: any) => sum + (session.duration_minutes || 0), 0) || 0
    const totalHours = Math.round(totalMinutes / 60)

    // Get average viewers this week
    const { data: viewerSessions } = await supabase
      .from('stream_sessions')
      .select('average_viewers, total_viewers')
      .gte('start_time', thisWeek.toISOString())
      .not('average_viewers', 'is', null)

    let avgViewers = 0
    if (viewerSessions?.length) {
      const totalViewers = viewerSessions.reduce((sum: number, session: any) => sum + (session.total_viewers || session.average_viewers || 0), 0)
      avgViewers = Math.round(totalViewers / viewerSessions.length)
    }

    const result = {
      totalStreamers: totalStreamersData?.length || 0,
      activeStreamers: activeStreamersData?.length || 0,
      pendingStreamers: pendingStreamersData?.length || 0,
      activeStreams: activeStreamsData?.length || 0,
      pendingPayouts: pendingPayoutsData?.length || 0,
      pendingKeyRequests: pendingKeyRequestsData?.length || 0,
      totalHours,
      avgViewers
    }

    console.log('Final dashboard stats result:', result)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
} 