import { NextRequest, NextResponse } from 'next/server'
// Use secure utility that avoids caching issues
const { createSupabaseServerClient } = require('../../../lib/supabase-server')

const supabase = createSupabaseServerClient()

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

    // Insert new key request
    const { data: newRequest, error } = await supabase
      .from('key_requests')
      .insert({
        streamer_id: streamer_id.trim(),
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