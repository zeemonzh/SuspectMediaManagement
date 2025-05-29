import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Handle email confirmation and activate user account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user to check if email is confirmed
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError || !user.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if email is confirmed
    if (!user.user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Email not confirmed yet' },
        { status: 400 }
      )
    }

    // Activate the streamer account
    const { error: updateError } = await supabase
      .from('streamers')
      .update({ is_active: true })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error activating streamer account:', updateError)
      return NextResponse.json(
        { error: 'Failed to activate account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Account activated successfully'
    })

  } catch (error) {
    console.error('Confirmation error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 