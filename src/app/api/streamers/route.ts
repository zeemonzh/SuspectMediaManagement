import { NextRequest, NextResponse } from 'next/server'
// Use secure utility that avoids caching issues
const { createSupabaseServerClient } = require('../../../lib/supabase-server')

const supabase = createSupabaseServerClient()

// GET - Fetch all streamers with calculated stats
export async function GET() {
  try {
    const { data: streamers, error } = await supabase
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

    if (error) throw error

    // Calculate stats for each streamer
    const streamersWithStats = streamers?.map(streamer => {
      const sessions = streamer.stream_sessions || []
      const payoutRequests = streamer.payout_requests || []

      // Calculate total hours from all sessions
      const total_hours = Math.round(
        sessions.reduce((sum: number, session: any) => 
          sum + (session.duration_minutes || 0), 0
        ) / 60 * 10
      ) / 10

      // Calculate average viewers across all sessions
      const avg_viewers = sessions.length > 0 
        ? Math.round(
            sessions.reduce((sum: number, session: any) => 
              sum + (session.average_viewers || 0), 0
            ) / sessions.length
          )
        : 0

      // Calculate total payout amount (approved and paid requests)
      const total_payout = payoutRequests
        .filter((req: any) => req.status === 'approved' || req.status === 'paid')
        .reduce((sum: number, req: any) => sum + (req.requested_amount || 0), 0)

      // Remove the joined data and return clean streamer object with stats
      const { stream_sessions, payout_requests, ...cleanStreamer } = streamer
      
      return {
        ...cleanStreamer,
        total_hours,
        avg_viewers,
        total_payout
      }
    }) || []

    return NextResponse.json(streamersWithStats)
  } catch (error) {
    console.error('Error fetching streamers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch streamers' },
      { status: 500 }
    )
  }
}

// POST - Create new streamer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, tiktok_username, email } = body

    if (!username || !tiktok_username || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: streamer, error } = await supabase
      .from('streamers')
      .insert({
        username,
        tiktok_username,
        email,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(streamer, { status: 201 })
  } catch (error) {
    console.error('Error creating streamer:', error)
    return NextResponse.json(
      { error: 'Failed to create streamer' },
      { status: 500 }
    )
  }
} 