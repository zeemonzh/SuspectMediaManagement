import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create service role client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface StreamerAnalytics {
  id: string
  username: string
  totalHours: number
  totalViews: number
  totalStreams: number
  goalCompletion: number
  goalDetails: {
    completed: number
    total: number
    timeGoalsMet: number
    viewerGoalsMet: number
    fullGoalsMet: number
  }
  growthRate: number
  lastStream: string
}

interface PlatformMetrics {
  totalStreams: number
  totalHours: number
  totalViewers: number
  avgStreamDuration: number
  activeStreamers: number
  monthlyGoalCompletions: number
  growthRates: {
    streams: number
    hours: number
    viewers: number
    activeStreamers: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || 'month'
    
    // Calculate date range based on timeframe
    const now = new Date()
    let startDate: Date
    
    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    
    // Get all streamers (not admins)
    const { data: allStreamers } = await supabase
      .from('streamers')
      .select('id, username, tiktok_username, is_active')
      .eq('role', 'streamer')
      .eq('is_active', true)
    
    if (!allStreamers) {
      return NextResponse.json({ streamers: [], metrics: null })
    }
    
    // Get stream sessions data for the timeframe
    const { data: sessions } = await supabase
      .from('stream_sessions')
      .select(`
        id,
        streamer_id,
        start_time,
        end_time,
        duration_minutes,
        peak_viewers,
        average_viewers,
        total_viewers,
        streamers!inner(id, username)
      `)
      .gte('start_time', startDate.toISOString())
      .not('duration_minutes', 'is', null)
    
    // Calculate analytics for each streamer
    const streamerAnalytics: StreamerAnalytics[] = []
    
    for (const streamer of allStreamers) {
      const streamerSessions = sessions?.filter(s => s.streamer_id === streamer.id) || []
      
      // Calculate metrics
      const totalStreams = streamerSessions.length
      const totalMinutes = streamerSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10
      const totalViews = streamerSessions.reduce((sum, s) => sum + (s.total_viewers || 0), 0)
      
      // Get last stream
      const lastStreamSession = streamerSessions
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]
      const lastStream = lastStreamSession?.start_time || new Date().toISOString()
      
      // Calculate goal completion (simplified - based on sessions meeting minimum requirements)
      const { data: streamerGoals } = await supabase
        .from('streamer_goals')
        .select('minimum_duration_minutes, target_viewers')
        .eq('streamer_id', streamer.id)
        .single()
      
      let minDuration = 60
      let targetViewers = 1000
      
      if (streamerGoals) {
        minDuration = streamerGoals.minimum_duration_minutes
        targetViewers = streamerGoals.target_viewers
      } else {
        // Get system defaults if no custom goals
        const { data: systemDefaults } = await supabase
          .from('system_defaults')
          .select('setting_value')
          .eq('setting_key', 'default_goals')
          .single()
        
        if (systemDefaults?.setting_value) {
          minDuration = systemDefaults.setting_value.minimum_duration_minutes || 60
          targetViewers = systemDefaults.setting_value.target_viewers || 1000
        }
      }
      
      // Calculate detailed goal metrics
      const timeGoalsMet = streamerSessions.filter(s => s.duration_minutes >= minDuration).length
      const viewerGoalsMet = streamerSessions.filter(s => s.average_viewers >= targetViewers).length
      const fullGoalsMet = streamerSessions.filter(s => 
        s.duration_minutes >= minDuration && s.average_viewers >= targetViewers
      ).length
      
      const goalCompletion = totalStreams > 0 ? Math.round((fullGoalsMet / totalStreams) * 100) : 0
      
      const goalDetails = {
        completed: fullGoalsMet,
        total: totalStreams,
        timeGoalsMet,
        viewerGoalsMet,
        fullGoalsMet
      }
      
      // Calculate growth rate (compare to previous period)
      const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()))
      const { data: previousSessions } = await supabase
        .from('stream_sessions')
        .select('total_viewers')
        .eq('streamer_id', streamer.id)
        .gte('start_time', previousPeriodStart.toISOString())
        .lt('start_time', startDate.toISOString())
        .not('duration_minutes', 'is', null)
      
      const prevTotalViews = previousSessions?.reduce((sum, s) => sum + (s.total_viewers || 0), 0) || 0
      
      const growthRate = prevTotalViews > 0 
        ? Math.round(((totalViews - prevTotalViews) / prevTotalViews) * 100 * 10) / 10
        : totalViews > 0 ? 100 : 0
      
      streamerAnalytics.push({
        id: streamer.id,
        username: streamer.username,
        totalHours,
        totalViews,
        totalStreams,
        goalCompletion,
        goalDetails,
        growthRate,
        lastStream
      })
    }
    
    // Calculate platform metrics
    const allSessions = sessions || []
    const totalStreams = allSessions.length
    const totalMinutes = allSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10
    const totalViewers = allSessions.reduce((sum, s) => sum + (s.total_viewers || 0), 0)
    const avgStreamDuration = totalStreams > 0 ? Math.round(totalMinutes / totalStreams) : 0
    const activeStreamers = allStreamers.filter(s => s.is_active === true).length
    
    // Count monthly goal completions
    const monthlyGoalCompletions = streamerAnalytics.reduce((sum, s) => {
      return sum + Math.round((s.goalCompletion / 100) * s.totalStreams)
    }, 0)
    
    // Calculate growth rates compared to previous period
    const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()))

    // Get previous period sessions data
    const { data: previousSessions } = await supabase
      .from('stream_sessions')
      .select('id, duration_minutes, peak_viewers, streamer_id')
      .gte('start_time', previousPeriodStart.toISOString())
      .lt('start_time', startDate.toISOString())
      .not('duration_minutes', 'is', null)
    
    const prevTotalStreams = previousSessions?.length || 0
    const prevTotalMinutes = previousSessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0
    const prevTotalHours = Math.round(prevTotalMinutes / 60)
    const prevTotalViewers = previousSessions?.reduce((sum, s) => sum + (s.peak_viewers || 0), 0) || 0

    // Get previous period active streamers
    const { data: previousStreamers } = await supabase
      .from('streamers')
      .select('id, is_active')
      .eq('role', 'streamer')
      .eq('is_active', true)
      .lte('created_at', previousPeriodStart.toISOString())

    const prevActiveStreamers = previousStreamers?.length || 0
    
    // Calculate growth percentages
    const growthRates = {
      streams: prevTotalStreams > 0 ? Math.round(((totalStreams - prevTotalStreams) / prevTotalStreams) * 100) : totalStreams > 0 ? 100 : 0,
      hours: prevTotalHours > 0 ? Math.round(((totalHours - prevTotalHours) / prevTotalHours) * 100) : totalHours > 0 ? 100 : 0,
      viewers: prevTotalViewers > 0 ? Math.round(((totalViewers - prevTotalViewers) / prevTotalViewers) * 100) : totalViewers > 0 ? 100 : 0,
      activeStreamers: prevActiveStreamers > 0 ? Math.round(((activeStreamers - prevActiveStreamers) / prevActiveStreamers) * 100) : activeStreamers > 0 ? 100 : 0
    }
    
    const platformMetrics: PlatformMetrics = {
      totalStreams,
      totalHours,
      totalViewers,
      avgStreamDuration,
      activeStreamers,
      monthlyGoalCompletions,
      growthRates
    }
    
    return NextResponse.json({
      streamers: streamerAnalytics,
      metrics: platformMetrics
    })
    
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
} 