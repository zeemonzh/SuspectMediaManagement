import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all invitation keys
export async function GET() {
  try {
    const { data: keys, error } = await supabase
      .from('invitation_keys')
      .select(`
        *,
        created_by_user:streamers!invitation_keys_created_by_fkey(username),
        used_by_user:streamers!invitation_keys_used_by_fkey(username)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform the data to match our interface
    const transformedKeys = keys?.map(key => ({
      id: key.id,
      code: key.code,
      created_by: key.created_by_user?.username || 'System',
      created_at: key.created_at,
      used_at: key.used_at,
      used_by: key.used_by_user?.username,
      is_active: key.is_active
    })) || []

    return NextResponse.json(transformedKeys)
  } catch (error) {
    console.error('Error fetching invitation keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation keys' },
      { status: 500 }
    )
  }
}

// POST - Generate new invitation keys
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { count = 1 } = body

    if (count < 1 || count > 50) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 50' },
        { status: 400 }
      )
    }

    // Generate unique codes
    const keysToInsert = []
    for (let i = 0; i < count; i++) {
      keysToInsert.push({
        code: `SUSPECT-${nanoid(12).toUpperCase()}`,
        created_by: null, // System-generated keys have no specific creator
        is_active: true
      })
    }

    const { data: newKeys, error } = await supabase
      .from('invitation_keys')
      .insert(keysToInsert)
      .select()

    if (error) throw error

    return NextResponse.json(newKeys, { status: 201 })
  } catch (error) {
    console.error('Error generating invitation keys:', error)
    return NextResponse.json(
      { error: 'Failed to generate invitation keys' },
      { status: 500 }
    )
  }
} 