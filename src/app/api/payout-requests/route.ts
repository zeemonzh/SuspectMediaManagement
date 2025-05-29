import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Prevent route caching
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all payout requests (for admin)
export async function GET() {
  try {
    const { data: requests, error } = await supabase
      .from('payout_requests')
      .select(`
        *,
        streamers!inner(
          id,
          username,
          tiktok_username,
          email
        ),
        stream_sessions!inner(
          id,
          start_time,
          end_time,
          duration_minutes,
          peak_viewers,
          average_viewers
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching payout requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payout requests' },
      { status: 500 }
    )
  }
}

// POST - Create new payout request (from streamer)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { streamer_id, stream_session_id, paypal_username } = body

    if (!streamer_id || !stream_session_id || !paypal_username) {
      return NextResponse.json(
        { error: 'Streamer ID, Stream Session ID, and PayPal username are required' },
        { status: 400 }
      )
    }

    // Get the stream session details
    const { data: session, error: sessionError } = await supabase
      .from('stream_sessions')
      .select('*')
      .eq('id', stream_session_id)
      .eq('streamer_id', streamer_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Stream session not found' },
        { status: 404 }
      )
    }

    // Check if payout already requested for this session
    const { data: existingRequest } = await supabase
      .from('payout_requests')
      .select('id')
      .eq('stream_session_id', stream_session_id)
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Payout already requested for this stream session' },
        { status: 400 }
      )
    }

    // Check if session meets minimum requirements (at least 1 hour)
    if (!session.meets_time_goal) {
      return NextResponse.json(
        { error: 'Stream session does not meet minimum time requirement' },
        { status: 400 }
      )
    }

    // Create payout request
    const { data: payoutRequest, error } = await supabase
      .from('payout_requests')
      .insert({
        streamer_id,
        stream_session_id,
        requested_amount: session.payout_amount,
        duration_minutes: session.duration_minutes,
        peak_viewers: session.peak_viewers,
        average_viewers: session.average_viewers,
        meets_time_goal: session.meets_time_goal,
        meets_viewer_goal: session.meets_viewer_goal,
        paypal_username: paypal_username.trim()
      })
      .select()
      .single()

    if (error) throw error

    // Mark session as payout requested
    await supabase
      .from('stream_sessions')
      .update({
        payout_requested: true,
        payout_request_date: new Date().toISOString()
      })
      .eq('id', stream_session_id)

    return NextResponse.json(payoutRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating payout request:', error)
    return NextResponse.json(
      { error: 'Failed to create payout request' },
      { status: 500 }
    )
  }
} 