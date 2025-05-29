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

    console.log('Creating payout request:', { streamer_id, stream_session_id, paypal_username })

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

    if (sessionError) {
      console.error('Error fetching stream session:', sessionError)
      return NextResponse.json(
        { error: 'Stream session not found' },
        { status: 404 }
      )
    }

    if (!session) {
      console.error('Stream session not found:', { stream_session_id, streamer_id })
      return NextResponse.json(
        { error: 'Stream session not found' },
        { status: 404 }
      )
    }

    console.log('Found stream session:', session)

    // Check if payout already requested for this session
    const { data: existingRequest, error: existingError } = await supabase
      .from('payout_requests')
      .select('id')
      .eq('stream_session_id', stream_session_id)
      .single()

    if (existingError && !existingError.message.includes('No rows found')) {
      console.error('Error checking existing request:', existingError)
      return NextResponse.json(
        { error: 'Failed to check existing payout request' },
        { status: 500 }
      )
    }

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
    const { data: payoutRequest, error: insertError } = await supabase
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

    if (insertError) {
      console.error('Error creating payout request:', insertError)
      return NextResponse.json(
        { error: 'Failed to create payout request' },
        { status: 500 }
      )
    }

    // Update stream session to mark payout as requested
    const { error: updateError } = await supabase
      .from('stream_sessions')
      .update({
        payout_requested: true,
        payout_request_date: new Date().toISOString()
      })
      .eq('id', stream_session_id)

    if (updateError) {
      console.error('Error updating stream session:', updateError)
      // Don't return error since payout request was created successfully
    }

    return NextResponse.json(payoutRequest)
  } catch (error) {
    console.error('Error creating payout request:', error)
    return NextResponse.json(
      { error: 'Failed to create payout request' },
      { status: 500 }
    )
  }
} 