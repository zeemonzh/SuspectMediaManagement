import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

// Prevent route caching
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all admin invitation keys
export async function GET() {
  try {
    const { data: keys, error } = await supabase
      .from('admin_invitations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // For each key, if it's used, fetch the admin username
    const transformedKeys = await Promise.all(keys?.map(async (key) => {
      let usedByAdmin = undefined
      
      if (key.used_by) {
        // Fetch the admin who used this key
        const { data: admin } = await supabase
          .from('streamers')
          .select('username, email')
          .eq('user_id', key.used_by)
          .eq('role', 'admin')
          .single()
        
        if (admin) {
          usedByAdmin = admin.username || admin.email
        }
      }

      return {
        id: key.id,
        code: key.invitation_key,
        created_by: 'System', // Most keys are system-generated
        created_at: key.created_at,
        used_at: key.used_at,
        used_by: usedByAdmin,
        is_active: !key.is_used
      }
    }) || [])

    return NextResponse.json(transformedKeys)
  } catch (error) {
    console.error('Error fetching admin invitation keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin invitation keys' },
      { status: 500 }
    )
  }
}

// POST - Generate new admin invitation keys
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
        invitation_key: `SUSPECT-${nanoid(10).toUpperCase()}`,
        created_by: null, // System-generated keys have no specific creator
        is_used: false
      })
    }

    const { data: newKeys, error } = await supabase
      .from('admin_invitations')
      .insert(keysToInsert)
      .select()

    if (error) throw error

    return NextResponse.json(newKeys, { status: 201 })
  } catch (error) {
    console.error('Error generating admin invitation keys:', error)
    return NextResponse.json(
      { error: 'Failed to generate admin invitation keys' },
      { status: 500 }
    )
  }
} 