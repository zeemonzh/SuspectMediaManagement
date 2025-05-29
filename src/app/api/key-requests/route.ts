import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Prevent route caching
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all key requests
export async function GET() {
  try {
    const { data: requests, error } = await supabase
      .from('key_requests')
      .select(`
        *,
        streamers!key_requests_streamer_id_fkey(
          id,
          username,
          tiktok_username
        ),
        product_categories!category_id(
          id,
          name,
          description
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching key requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch key requests' },
      { status: 500 }
    )
  }
}

// POST - Create new key request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { streamer_id, category_id } = body

    if (!streamer_id || !streamer_id.trim()) {
      return NextResponse.json(
        { error: 'Streamer ID is required' },
        { status: 400 }
      )
    }

    if (!category_id || !category_id.trim()) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }

    // Check if streamer already has an active (non-expired) key
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: activeKeys, error: keyCheckError } = await supabase
      .from('product_keys')
      .select('id, key, assigned_at')
      .eq('assigned_to', streamer_id.trim())
      .eq('is_assigned', true)
      .gte('assigned_at', twentyFourHoursAgo) // Only keys assigned within last 24 hours

    if (keyCheckError) {
      console.error('Error checking for active keys:', keyCheckError)
      return NextResponse.json(
        { error: 'Failed to check for existing keys' },
        { status: 500 }
      )
    }

    if (activeKeys && activeKeys.length > 0) {
      const activeKey = activeKeys[0]
      const assignedAt = new Date(activeKey.assigned_at)
      const expiresAt = new Date(assignedAt.getTime() + 24 * 60 * 60 * 1000)
      const timeLeft = expiresAt.getTime() - Date.now()
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60))
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))

      return NextResponse.json(
        { 
          error: `You already have an active key that expires in ${hoursLeft}h ${minutesLeft}m. Please wait for your current key to expire before requesting a new one.`,
          activeKey: {
            key: activeKey.key,
            expires_at: expiresAt.toISOString(),
            hours_left: hoursLeft,
            minutes_left: minutesLeft
          }
        },
        { status: 409 }
      )
    }

    // Check if there's already a pending request for this streamer
    const { data: pendingRequests, error: requestCheckError } = await supabase
      .from('key_requests')
      .select('id, status')
      .eq('streamer_id', streamer_id.trim())
      .eq('status', 'pending')

    if (requestCheckError) {
      console.error('Error checking for pending requests:', requestCheckError)
      return NextResponse.json(
        { error: 'Failed to check for existing requests' },
        { status: 500 }
      )
    }

    if (pendingRequests && pendingRequests.length > 0) {
      return NextResponse.json(
        { error: 'You already have a pending key request. Please wait for admin approval.' },
        { status: 409 }
      )
    }

    // Get the category name for the product_name field (required by database)
    const { data: category, error: categoryError } = await supabase
      .from('product_categories')
      .select('name')
      .eq('id', category_id.trim())
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Invalid category selected' },
        { status: 400 }
      )
    }

    // Insert new key request
    const { data: newRequest, error } = await supabase
      .from('key_requests')
      .insert({
        streamer_id: streamer_id.trim(),
        product_name: category.name, // Use category name for backwards compatibility
        category_id: category_id.trim(),
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        streamers!key_requests_streamer_id_fkey(
          id,
          username,
          tiktok_username
        ),
        product_categories!category_id(
          id,
          name,
          description
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json(newRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating key request:', error)
    return NextResponse.json(
      { error: 'Failed to create key request' },
      { status: 500 }
    )
  }
} 