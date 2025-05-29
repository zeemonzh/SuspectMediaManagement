import { NextRequest, NextResponse } from 'next/server'
// Use secure utility that avoids caching issues
const { createSupabaseServerClient } = require('../../../lib/supabase-server')

const supabase = createSupabaseServerClient()

// GET - Fetch all streamer goals
export async function GET() {
  try {
    const { data: goals, error } = await supabase
      .from('streamer_goals')
      .select(`
        *,
        streamers!inner(
          id,
          username,
          tiktok_username,
          email,
          role
        )
      `)
      .eq('streamers.role', 'streamer')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(goals)
  } catch (error) {
    console.error('Error fetching streamer goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch streamer goals' },
      { status: 500 }
    )
  }
}

// POST - Create or update streamer goal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      streamer_id, 
      minimum_duration_minutes, 
      target_viewers, 
      base_payout, 
      partial_payout 
    } = body

    if (!streamer_id) {
      return NextResponse.json(
        { error: 'Streamer ID is required' },
        { status: 400 }
      )
    }

    // Upsert the goal (insert or update if exists)
    const { data: goal, error } = await supabase
      .from('streamer_goals')
      .upsert({
        streamer_id,
        minimum_duration_minutes: minimum_duration_minutes || 60,
        target_viewers: target_viewers || 1000,
        base_payout: base_payout || 7.20,
        partial_payout: partial_payout || 4.50,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'streamer_id'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating streamer goal:', error)
    return NextResponse.json(
      { error: 'Failed to save streamer goal' },
      { status: 500 }
    )
  }
} 