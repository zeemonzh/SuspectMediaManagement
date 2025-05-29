import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Regular supabase client for normal signup flow
const publicSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password, role, username, invitationKey, tiktokUsername } = await request.json()

    console.log('API Registration starting for:', email, 'as role:', role)

    // Validate invitation key for admin accounts
    if (role === 'admin') {
      if (!invitationKey) {
        return NextResponse.json(
          { error: 'Invitation key is required for admin accounts' },
          { status: 400 }
        )
      }

      console.log('Validating admin invitation key:', invitationKey)
      
      // Check if invitation key is valid and unused
      const { data: invitation, error: inviteError } = await supabase
        .from('admin_invitations')
        .select('*')
        .eq('invitation_key', invitationKey)
        .eq('is_used', false)
        .single()

      if (inviteError || !invitation) {
        console.error('Invalid invitation key:', inviteError)
        return NextResponse.json(
          { error: 'Invalid or expired invitation key' },
          { status: 400 }
        )
      }

      // Check if key has expired
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Invitation key has expired' },
          { status: 400 }
        )
      }

      console.log('Invitation key validated successfully')
    }

    // Store registration data temporarily for completion after email confirmation
    // We'll store this in a temporary table or use metadata
    const registrationData = {
      role,
      username: username || email.split('@')[0],
      tiktokUsername: role === 'streamer' ? (tiktokUsername || '') : null,
      invitationKey: role === 'admin' ? invitationKey : null
    }

    // Use regular signup flow which will send confirmation email
    const { data: authData, error: authError } = await publicSupabase.auth.signUp({
      email,
      password,
      options: {
        data: registrationData // Store custom data in user metadata
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json(
        { error: 'Failed to create user account: ' + authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 400 }
      )
    }

    console.log('Auth user created successfully:', authData.user.id, 'Confirmation required:', !authData.user.email_confirmed_at)

    return NextResponse.json({ 
      success: true,
      message: 'Account created successfully. Please check your email to verify your account before signing in.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        email_confirmed: !!authData.user.email_confirmed_at
      }
    })

  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration' },
      { status: 500 }
    )
  }
} 