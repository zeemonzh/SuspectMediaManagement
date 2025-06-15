import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Prevent route caching
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all streamers with calculated stats
export async function GET(request: NextRequest) {
  try {
    const { data: streamers, error } = await supabase
      .from('streamers')
      .select(`
        *,
        stream_sessions!left(
          duration_minutes,
          total_viewers,
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

      // Calculate total views across all sessions
      const total_views = sessions.reduce((sum: number, session: any) => 
        sum + (session.total_viewers || 0), 0
      )

      // Calculate total payout amount (approved and paid requests)
      const total_payout = payoutRequests
        .filter((req: any) => req.status === 'approved' || req.status === 'paid')
        .reduce((sum: number, req: any) => sum + (req.requested_amount || 0), 0)

      // Remove the joined data and return clean streamer object with stats
      const { stream_sessions, payout_requests, ...cleanStreamer } = streamer
      
      return {
        ...cleanStreamer,
        total_hours,
        total_views,
        total_payout
      }
    }) || []

    // Add cache control headers
    const headers = new Headers({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    })

    return NextResponse.json(streamersWithStats, { headers })
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