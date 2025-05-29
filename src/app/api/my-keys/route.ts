import { NextRequest, NextResponse } from 'next/server'
// Use secure utility that avoids caching issues
const { createSupabaseServerClient } = require('../../../lib/supabase-server')

const supabase = createSupabaseServerClient()

// GET - Fetch streamer's assigned keys
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const streamerId = searchParams.get('streamer_id')

    if (!streamerId) {
      return NextResponse.json(
        { error: 'Streamer ID is required' },
        { status: 400 }
      )
    }

    const { data: keys, error } = await supabase
      .from('product_keys')
      .select(`
        *,
        product_categories!category_id(
          id,
          name,
          description
        )
      `)
      .eq('assigned_to', streamerId)
      .eq('is_assigned', true)
      .order('assigned_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(keys)
  } catch (error) {
    console.error('Error fetching streamer keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch keys' },
      { status: 500 }
    )
  }
} 