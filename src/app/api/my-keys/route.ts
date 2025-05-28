import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Utility function to check and clean up expired keys
async function cleanupExpiredKeys() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    // Find expired keys (assigned more than 24 hours ago)
    const { data: expiredKeys, error: fetchError } = await supabase
      .from('product_keys')
      .select('id, key, assigned_to')
      .eq('is_assigned', true)
      .lt('assigned_at', twentyFourHoursAgo)

    if (fetchError) {
      console.error('Error fetching expired keys:', fetchError)
      return
    }

    if (expiredKeys && expiredKeys.length > 0) {
      console.log(`Found ${expiredKeys.length} expired keys, cleaning up...`)
      
      // Delete the expired keys completely
      const { error: deleteError } = await supabase
        .from('product_keys')
        .delete()
        .eq('is_assigned', true)
        .lt('assigned_at', twentyFourHoursAgo)

      if (deleteError) {
        console.error('Error deleting expired keys:', deleteError)
      } else {
        console.log(`Successfully cleaned up ${expiredKeys.length} expired keys`)
      }
    }
  } catch (error) {
    console.error('Error in cleanup expired keys:', error)
  }
}

// GET - Fetch streamer's assigned keys (only active, non-expired)
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

    // First, clean up any expired keys
    await cleanupExpiredKeys()

    // Calculate the expiration threshold (24 hours ago)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Fetch only non-expired keys
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
      .gte('assigned_at', twentyFourHoursAgo) // Only keys assigned within last 24 hours
      .order('assigned_at', { ascending: false })

    if (error) throw error

    // Add expiration info to each key
    const keysWithExpiration = keys.map(key => {
      const assignedAt = new Date(key.assigned_at)
      const expiresAt = new Date(assignedAt.getTime() + 24 * 60 * 60 * 1000)
      const timeLeft = expiresAt.getTime() - Date.now()
      const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)))
      const minutesLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)))

      return {
        ...key,
        expires_at: expiresAt.toISOString(),
        hours_left: hoursLeft,
        minutes_left: minutesLeft,
        is_expired: timeLeft <= 0
      }
    })

    return NextResponse.json(keysWithExpiration)
  } catch (error) {
    console.error('Error fetching streamer keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch keys' },
      { status: 500 }
    )
  }
} 