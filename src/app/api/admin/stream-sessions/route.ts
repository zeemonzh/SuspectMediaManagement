import { NextRequest, NextResponse } from 'next/server'
// Use secure utility that avoids caching issues
const { createSupabaseServerClient } = require('../../../../lib/supabase-server')

const supabase = createSupabaseServerClient()

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const search = url.searchParams.get('search') || ''
    const streamer = url.searchParams.get('streamer') || ''
    const dateRange = url.searchParams.get('dateRange') || 'week'
    const sortBy = url.searchParams.get('sortBy') || 'start_time'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'

    // Build the base query
    let query = supabase
      .from('stream_sessions')
      .select(`
        *,
        streamers (
          username,
          tiktok_username
        )
      `)

    // Apply date range filter
    const now = new Date()
    let startDate: Date

    switch (dateRange) {
      case 'today':
        startDate = new Date(now)
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'all':
      default:
        startDate = new Date('2020-01-01') // Far back date for "all"
        break
    }

    if (dateRange !== 'all') {
      query = query.gte('start_time', startDate.toISOString())
    }

    // Apply search filter - we need to do this differently since we can't filter on joined tables directly
    // We'll get all sessions first, then filter in JavaScript
    
    // Apply streamer filter - this also needs to be handled differently
    // For now, let's remove these filters and handle them after the query

    // Apply sorting
    const ascending = sortOrder === 'asc'
    switch (sortBy) {
      case 'duration':
        query = query.order('duration_minutes', { ascending, nullsFirst: false })
        break
      case 'viewers':
        query = query.order('average_viewers', { ascending, nullsFirst: false })
        break
      case 'start_time':
      default:
        query = query.order('start_time', { ascending })
        break
    }

    // Limit results for performance
    query = query.limit(100)

    const { data: sessions, error } = await query

    if (error) throw error

    // Add is_live flag and format the data
    let formattedSessions = sessions?.map(session => ({
      ...session,
      is_live: !session.end_time
    })) || []

    // Apply search filter in JavaScript
    if (search) {
      const searchLower = search.toLowerCase()
      formattedSessions = formattedSessions.filter(session => 
        session.streamers?.username?.toLowerCase().includes(searchLower) ||
        session.streamers?.tiktok_username?.toLowerCase().includes(searchLower)
      )
    }

    // Apply streamer filter in JavaScript
    if (streamer) {
      formattedSessions = formattedSessions.filter(session => 
        session.streamers?.username === streamer
      )
    }

    return NextResponse.json(formattedSessions)

  } catch (error) {
    console.error('Error fetching stream sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stream sessions' },
      { status: 500 }
    )
  }
} 