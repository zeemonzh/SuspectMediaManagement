import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Prevent route caching
export const dynamic = 'force-dynamic'

// Create service role client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AdminPayout {
  id: string
  streamer_id: string
  streamer_username: string
  amount: number
  month: string
  status: 'pending' | 'approved' | 'denied' | 'paid'
  calculated_amount: number
  admin_notes?: string
  paid_at?: string
  created_at: string
  type: 'request' | 'legacy'
  stream_session_id?: string
  duration_minutes?: number
  meets_time_goal?: boolean
  meets_viewer_goal?: boolean
  payment_method: 'paypal' | 'ltc'
  paypal_username?: string
  ltc_address?: string
}

export async function GET(request: NextRequest) {
  try {
    const allPayouts: AdminPayout[] = []

    // Get payout requests (the new system)
    const { data: payoutRequests, error: requestsError } = await supabase
      .from('payout_requests')
      .select(`
        *,
        streamers:streamers(
          id,
          username,
          tiktok_username,
          email
        ),
        stream_sessions:stream_sessions(
          id,
          start_time,
          end_time,
          duration_minutes
        )
      `)
      .order('created_at', { ascending: false })

    if (requestsError) {
      console.error('Error fetching payout requests:', requestsError)
    } else if (payoutRequests) {
      payoutRequests.forEach((request: any) => {
        const month = new Date(request.created_at).toISOString().substring(0, 7)
        allPayouts.push({
          id: request.id,
          streamer_id: request.streamer_id,
          streamer_username: request.streamers?.username || 'Unknown',
          amount: request.requested_amount,
          month,
          status: request.status,
          calculated_amount: request.requested_amount,
          admin_notes: request.admin_notes,
          paid_at: request.status === 'approved' ? request.processed_at : undefined,
          created_at: request.created_at,
          type: 'request',
          stream_session_id: request.stream_session_id,
          duration_minutes: request.duration_minutes,
          meets_time_goal: request.meets_time_goal,
          meets_viewer_goal: request.meets_viewer_goal,
          payment_method: request.payment_method || 'paypal',
          paypal_username: request.paypal_username,
          ltc_address: request.ltc_address
        })
      })
    }

    // Get legacy payouts (the old system)
    const { data: legacyPayouts, error: legacyError } = await supabase
      .from('payouts')
      .select(`
        *,
        streamers:streamers(
          id,
          username,
          tiktok_username,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (legacyError) {
      console.error('Error fetching legacy payouts:', legacyError)
    } else if (legacyPayouts) {
      legacyPayouts.forEach((payout: any) => {
        allPayouts.push({
          id: `legacy-${payout.id}`,
          streamer_id: payout.streamer_id,
          streamer_username: payout.streamers?.username || 'Unknown',
          amount: payout.amount,
          month: payout.month,
          status: payout.status === 'paid' ? 'paid' : 'pending',
          calculated_amount: payout.calculated_amount,
          admin_notes: payout.admin_notes,
          paid_at: payout.paid_at,
          created_at: payout.created_at,
          type: 'legacy',
          payment_method: 'paypal'
        })
      })
    }

    // Sort all payouts by creation date (most recent first)
    allPayouts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json(allPayouts)

  } catch (error) {
    console.error('Error fetching admin payouts:', error)
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
  }
}

// PATCH - Update payout status (for both request and legacy types)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { payoutId, status, admin_notes } = body

    if (!payoutId || !status) {
      return NextResponse.json(
        { error: 'Payout ID and status are required' },
        { status: 400 }
      )
    }

    if (payoutId.startsWith('legacy-')) {
      // Handle legacy payout update
      const legacyId = payoutId.replace('legacy-', '')
      const { error } = await supabase
        .from('payouts')
        .update({
          status: status === 'approved' ? 'paid' : status,
          admin_notes,
          paid_at: status === 'paid' || status === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', legacyId)

      if (error) throw error
    } else {
      // Handle payout request update
      const updateData: any = {
        status,
        admin_notes,
        processed_at: new Date().toISOString()
      }
      
      // Add paid_at timestamp when marking as paid
      if (status === 'paid') {
        updateData.paid_at = new Date().toISOString()
      }
      
      const { error } = await supabase
        .from('payout_requests')
        .update(updateData)
        .eq('id', payoutId)

      if (error) throw error
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating payout:', error)
    return NextResponse.json({ error: 'Failed to update payout' }, { status: 500 })
  }
} 