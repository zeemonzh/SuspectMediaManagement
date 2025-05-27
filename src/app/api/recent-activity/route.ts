import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

interface Activity {
  id: string
  type: string
  message: string
  timestamp: string
  color: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const activities: Activity[] = []
    
    // Get recent stream sessions (started in last 48h for more content)
    const { data: recentStreams } = await supabase
      .from('stream_sessions')
      .select(`
        id,
        start_time,
        end_time,
        duration_minutes,
        average_viewers,
        total_viewers,
        streamers (username)
      `)
      .gte('start_time', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: false })
      .limit(15)

    if (recentStreams) {
      recentStreams.forEach((stream: any) => {
        const streamerName = stream.streamers?.username || 'Unknown'
        
        // Always add stream start activity
        activities.push({
          id: `stream-start-${stream.id}`,
          type: 'stream_start', 
          message: `${streamerName} started streaming`,
          timestamp: stream.start_time,
          color: 'bg-green-500'
        })
        
        // Add stream end activity if stream has ended
        if (stream.end_time) {
          const duration = stream.duration_minutes ? `(${Math.round(stream.duration_minutes / 60 * 10) / 10}h)` : ''
          const viewerInfo = stream.average_viewers ? ` - ${stream.average_viewers} avg viewers` : ''
          
          activities.push({
            id: `stream-end-${stream.id}`,
            type: 'stream_end',
            message: `${streamerName} finished streaming ${duration}${viewerInfo}`,
            timestamp: stream.end_time,
            color: 'bg-red-500'
          })
        }
      })
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Return top 5 activities
    return NextResponse.json(activities.slice(0, 5))

  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return NextResponse.json({ error: 'Failed to fetch recent activity' }, { status: 500 })
  }
} 