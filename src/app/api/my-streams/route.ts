import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch streamer's own stream sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const streamerId = searchParams.get('streamer_id')

    if (!streamerId) {
      return NextResponse.json(
        { error: 'Streamer ID is required' },
        { status: 400 }
      )
    }

    const { data: sessions, error } = await supabase
      .from('stream_sessions')
      .select(`
        *,
        payout_requests(
          id,
          status,
          requested_amount,
          created_at
        )
      `)
      .eq('streamer_id', streamerId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching stream sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stream sessions' },
      { status: 500 }
    )
  }
} 