import { NextRequest, NextResponse } from 'next/server'
// Use secure utility that avoids caching issues
const { createSupabaseServerClient } = require('../../../../lib/supabase-server')

const supabase = createSupabaseServerClient()

// PATCH - Update payout request status (approve/deny)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { id } = params
    const { status, admin_notes, processed_by } = body

    if (!status || !['approved', 'denied'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status (approved/denied) is required' },
        { status: 400 }
      )
    }

    const { data: payoutRequest, error } = await supabase
      .from('payout_requests')
      .update({
        status,
        admin_notes,
        processed_by,
        processed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // If approved, create a payout record in the old payouts table for tracking
    if (status === 'approved') {
      const currentMonth = new Date().toISOString().substring(0, 7)
      
      await supabase
        .from('payouts')
        .insert({
          streamer_id: payoutRequest.streamer_id,
          amount: payoutRequest.requested_amount,
          month: currentMonth,
          status: 'pending',
          calculated_amount: payoutRequest.requested_amount,
          admin_notes: `Auto-generated from stream session payout request. ${admin_notes || ''}`
        })
    }

    return NextResponse.json(payoutRequest)
  } catch (error) {
    console.error('Error updating payout request:', error)
    return NextResponse.json(
      { error: 'Failed to update payout request' },
      { status: 500 }
    )
  }
}

// GET - Get specific payout request details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { data: payoutRequest, error } = await supabase
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
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json(payoutRequest)
  } catch (error) {
    console.error('Error fetching payout request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payout request' },
      { status: 500 }
    )
  }
} 