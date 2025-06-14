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
    const { 
      streamer_id, 
      stream_session_id, 
      payment_method,
      paypal_username,
      ltc_address 
    } = body

    console.log('Creating payout request:', { 
      streamer_id, 
      stream_session_id, 
      payment_method,
      paypal_username,
      ltc_address 
    })

    if (!streamer_id || !stream_session_id || !payment_method) {
      return NextResponse.json(
        { error: 'Streamer ID, Stream Session ID, and payment method are required' },
        { status: 400 }
      )
    }

    // Validate payment info based on method
    if (payment_method === 'paypal' && !paypal_username) {
      return NextResponse.json(
        { error: 'PayPal username is required for PayPal payments' },
        { status: 400 }
      )
    }

    if (payment_method === 'ltc' && !ltc_address) {
      return NextResponse.json(
        { error: 'LTC address is required for Litecoin payments' },
        { status: 400 }
      )
    }

    // Validate LTC address format
    if (payment_method === 'ltc' && !/^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(ltc_address)) {
      return NextResponse.json(
        { error: 'Invalid LTC address format' },
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
    const { data: existingRequests, error: existingError } = await supabase
      .from('payout_requests')
      .select('id')
      .eq('stream_session_id', stream_session_id)

    if (existingError) {
      console.error('Error checking existing request:', existingError)
      return NextResponse.json(
        { error: 'Failed to check existing payout request' },
        { status: 500 }
      )
    }

    if (existingRequests && existingRequests.length > 0) {
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

    // Prepare payout request data
    const payoutRequestData = {
      streamer_id,
      stream_session_id,
      requested_amount: session.payout_amount || 0,
      duration_minutes: session.duration_minutes || 0,
      total_viewers: session.total_viewers || 0,
      meets_time_goal: session.meets_time_goal || false,
      meets_viewer_goal: session.meets_viewer_goal || false,
      payment_method,
      paypal_username: payment_method === 'paypal' && paypal_username ? paypal_username.trim() : null,
      ltc_address: payment_method === 'ltc' && ltc_address ? ltc_address.trim() : null,
      status: 'pending'
    }

    // Validate the data before inserting
    if (payoutRequestData.requested_amount < 0) {
      return NextResponse.json(
        { error: 'Invalid payout amount' },
        { status: 400 }
      )
    }

    console.log('Creating payout request with data:', payoutRequestData)

    // Create payout request
    const { data: payoutRequest, error: insertError } = await supabase
      .from('payout_requests')
      .insert([payoutRequestData])
      .select()

    if (insertError) {
      console.error('Error creating payout request:', insertError)
      console.error('Error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      })
      return NextResponse.json(
        { error: `Failed to create payout request: ${insertError.message}` },
        { status: 500 }
      )
    }

    if (!payoutRequest || payoutRequest.length === 0) {
      console.error('No payout request created')
      return NextResponse.json(
        { error: 'Failed to create payout request: No data returned' },
        { status: 500 }
      )
    }

    console.log('Successfully created payout request:', payoutRequest)

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

    return NextResponse.json(payoutRequest[0])
  } catch (error: any) {
    console.error('Unhandled error creating payout request:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json(
      { error: `Failed to create payout request: ${error.message}` },
      { status: 500 }
    )
  }
} 