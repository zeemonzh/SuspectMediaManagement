import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH - Update key request status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, admin_notes } = body
    const requestId = params.id

    if (!status || !['approved', 'denied'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status (approved/denied) is required' },
        { status: 400 }
      )
    }

    // Update the key request
    const { data: updatedRequest, error } = await supabase
      .from('key_requests')
      .update({
        status,
        admin_notes: admin_notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select(`
        *,
        streamers!key_requests_streamer_id_fkey(
          id,
          username,
          tiktok_username
        )
      `)
      .single()

    if (error) throw error

    // If approved, try to assign an available key
    if (status === 'approved') {
      let availableKey = null;

      // First, try to find a key that matches the requested category
      const { data: matchingKey } = await supabase
        .from('product_keys')
        .select('*')
        .eq('is_assigned', false)
        .eq('category_id', updatedRequest.category_id)
        .limit(1)
        .single()

      if (matchingKey) {
        availableKey = matchingKey;
      } else {
        // If no matching category found, assign any available key
        const { data: anyKey } = await supabase
          .from('product_keys')
          .select('*')
          .eq('is_assigned', false)
          .limit(1)
          .single()
        
        availableKey = anyKey;
      }

      // Check if we found an available key
      if (!availableKey) {
        return NextResponse.json(
          { error: 'Cannot approve request: No available keys in the system. Please add more keys before approving.' },
          { status: 400 }
        )
      }

      // Assign the key to the streamer
      const { error: assignError } = await supabase
        .from('product_keys')
        .update({
          is_assigned: true,
          assigned_to: updatedRequest.streamer_id,
          assigned_at: new Date().toISOString()
        })
        .eq('id', availableKey.id)

      if (assignError) {
        return NextResponse.json(
          { error: 'Failed to assign key to streamer' },
          { status: 500 }
        )
      }

      // Update the key request with the assigned key
      await supabase
        .from('key_requests')
        .update({
          assigned_key_id: availableKey.id
        })
        .eq('id', requestId)
    }

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error('Error updating key request:', error)
    return NextResponse.json(
      { error: 'Failed to update key request' },
      { status: 500 }
    )
  }
} 