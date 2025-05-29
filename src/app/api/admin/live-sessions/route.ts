import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Prevent route caching
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get all currently live sessions (no end_time)
    const { data: liveSessions, error } = await supabase
      .from('stream_sessions')
      .select(`
        *,
        streamers (
          username,
          tiktok_username
        )
      `)
      .is('end_time', null)
      .order('start_time', { ascending: false })

    if (error) throw error

    // Add is_live flag and format the data
    const formattedSessions = liveSessions?.map(session => ({
      ...session,
      is_live: true
    })) || []

    return NextResponse.json(formattedSessions)

  } catch (error) {
    console.error('Error fetching live sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live sessions' },
      { status: 500 }
    )
  }
} 