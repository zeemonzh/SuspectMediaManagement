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

// GET - Fetch all product keys
export async function GET() {
  try {
    // First, clean up any expired keys
    await cleanupExpiredKeys()

    const { data: keys, error } = await supabase
      .from('product_keys')
      .select(`
        *,
        streamers!assigned_to(
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

    // Add expiration info to assigned keys
    const keysWithExpiration = keys.map(key => {
      if (key.is_assigned && key.assigned_at) {
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
      }
      return key
    })

    return NextResponse.json(keysWithExpiration)
  } catch (error) {
    console.error('Error fetching product keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product keys' },
      { status: 500 }
    )
  }
}

// POST - Add new product key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, category_id } = body

    if (!key || !key.trim()) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      )
    }

    if (!category_id || !category_id.trim()) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }

    // Check if key already exists
    const { data: existingKey } = await supabase
      .from('product_keys')
      .select('id')
      .eq('key', key.trim())
      .single()

    if (existingKey) {
      return NextResponse.json(
        { error: 'Key already exists' },
        { status: 409 }
      )
    }

    // Verify the category exists first
    const { data: categoryExists, error: categoryError } = await supabase
      .from('product_categories')
      .select('id, name')
      .eq('id', category_id.trim())
      .single()

    if (categoryError) {
      console.error('Error checking category:', categoryError)
      if (categoryError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product categories table does not exist. Please run migrations.' },
          { status: 500 }
        )
      }
      throw categoryError
    }

    if (!categoryExists) {
      return NextResponse.json(
        { error: 'Selected category does not exist' },
        { status: 400 }
      )
    }

    // Insert new key
    const insertData = {
      key: key.trim(),
      category_id: category_id.trim(),
      product_name: categoryExists.name || 'Unknown', // For backwards compatibility
      is_assigned: false,
      created_at: new Date().toISOString()
    }

    console.log('Inserting key data:', insertData)

    const { data: newKey, error } = await supabase
      .from('product_keys')
      .insert(insertData)
      .select(`
        *,
        product_categories!category_id(
          id,
          name,
          description
        )
      `)
      .single()

    if (error) {
      console.error('Database error inserting key:', error)
      throw error
    }

    return NextResponse.json(newKey, { status: 201 })
  } catch (error) {
    console.error('Error creating product key:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as any)?.code || 'Unknown'
    return NextResponse.json(
      { error: `Failed to create product key: ${errorMessage} (Code: ${errorCode})` },
      { status: 500 }
    )
  }
}

// DELETE - Delete a product key
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id || !id.trim()) {
      return NextResponse.json(
        { error: 'Key ID is required' },
        { status: 400 }
      )
    }

    // Delete the key
    const { error: deleteError } = await supabase
      .from('product_keys')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ message: 'Key deleted successfully' })
  } catch (error) {
    console.error('Error deleting product key:', error)
    return NextResponse.json(
      { error: 'Failed to delete product key' },
      { status: 500 }
    )
  }
} 