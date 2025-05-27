import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch system default goals
export async function GET() {
  try {
    const { data: defaults, error } = await supabase
      .from('system_defaults')
      .select('setting_value')
      .eq('setting_key', 'default_goals')
      .single()

    if (error) {
      // Return hardcoded defaults if no system defaults exist
      return NextResponse.json({
        minimum_duration_minutes: 60,
        target_viewers: 1000,
        base_payout: 7.20,
        partial_payout: 4.50
      })
    }

    return NextResponse.json(defaults.setting_value)
  } catch (error) {
    console.error('Error fetching system defaults:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system defaults' },
      { status: 500 }
    )
  }
}

// POST - Update system default goals
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      minimum_duration_minutes, 
      target_viewers, 
      base_payout, 
      partial_payout 
    } = body

    // Validate required fields
    if (!minimum_duration_minutes || !target_viewers || !base_payout || !partial_payout) {
      return NextResponse.json(
        { error: 'All goal fields are required' },
        { status: 400 }
      )
    }

    const defaultsData = {
      minimum_duration_minutes: parseInt(minimum_duration_minutes),
      target_viewers: parseInt(target_viewers),
      base_payout: parseFloat(base_payout),
      partial_payout: parseFloat(partial_payout)
    }

    // Upsert the system defaults
    const { data: result, error } = await supabase
      .from('system_defaults')
      .upsert({
        setting_key: 'default_goals',
        setting_value: defaultsData,
        description: 'Default goal settings for new streamers',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(result.setting_value, { status: 200 })
  } catch (error) {
    console.error('Error updating system defaults:', error)
    return NextResponse.json(
      { error: 'Failed to update system defaults' },
      { status: 500 }
    )
  }
} 