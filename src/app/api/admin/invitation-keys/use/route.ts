import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Mark an invitation key as used
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invitation_key, used_by } = body

    if (!invitation_key || !used_by) {
      return NextResponse.json(
        { error: 'invitation_key and used_by are required' },
        { status: 400 }
      )
    }

    // Update the invitation key to mark it as used
    const { data, error } = await supabase
      .from('admin_invitations')
      .update({
        used_by: used_by,
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('invitation_key', invitation_key)
      .eq('is_used', false) // Only update if it's currently unused
      .select()

    if (error) {
      console.error('Error updating invitation key:', error)
      return NextResponse.json(
        { error: 'Failed to update invitation key: ' + error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Invitation key not found or already used' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation key marked as used successfully',
      data: data[0]
    })
  } catch (error) {
    console.error('Error processing invitation key use:', error)
    return NextResponse.json(
      { error: 'Failed to process invitation key use' },
      { status: 500 }
    )
  }
} 