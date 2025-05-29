import { NextRequest, NextResponse } from 'next/server'
// Use secure utility that avoids caching issues
const { createSupabaseServerClient } = require('../../../../lib/supabase-server')

const supabase = createSupabaseServerClient()

// POST - Register new user and create streamer record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, role, username, invitationKey, tiktokUsername } = body

    if (!email || !password || !role || !username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate invitation key for admin accounts
    if (role === 'admin') {
      if (!invitationKey) {
        return NextResponse.json(
          { error: 'Invitation key is required for admin accounts' },
          { status: 400 }
        )
      }

      // Check if invitation key is valid and unused
      const { data: invitation, error: inviteError } = await supabase
        .from('admin_invitations')
        .select('*')
        .eq('invitation_key', invitationKey)
        .eq('is_used', false)
        .single()

      if (inviteError || !invitation) {
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
    }

    // Create auth user - use normal signup flow to send confirmation email
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // This will trigger the confirmation email
      user_metadata: {
        role: role,
        username: username,
        tiktok_username: role === 'streamer' ? (tiktokUsername || '') : 'N/A'
      }
    })

    if (error) {
      console.error('Auth user creation error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Create streamer record using service role (bypasses RLS)
    // We'll create this even if email isn't confirmed yet
    const { error: streamerError } = await supabase
      .from('streamers')
      .insert({
        user_id: data.user.id,
        username: username,
        tiktok_username: role === 'streamer' ? (tiktokUsername || '') : 'N/A',
        email: email,
        role: role,
        is_active: false // Set to false until email is confirmed
      })

    if (streamerError) {
      console.error('Error creating streamer record:', streamerError)
      
      // Clean up auth user if streamer creation fails
      await supabase.auth.admin.deleteUser(data.user.id)
      
      return NextResponse.json(
        { error: 'Failed to create user profile: ' + streamerError.message },
        { status: 500 }
      )
    }

    // Mark invitation key as used for admin accounts
    if (role === 'admin' && invitationKey) {
      const { error: updateError } = await supabase
        .from('admin_invitations')
        .update({
          used_by: data.user.id,
          is_used: true,
          used_at: new Date().toISOString()
        })
        .eq('invitation_key', invitationKey)
      
      if (updateError) {
        console.error('Error updating invitation key:', updateError)
        // Don't fail registration for this, just log it
      }
    }

    return NextResponse.json({ 
      message: 'User created successfully. Please check your email to confirm your account.',
      user: { id: data.user.id, email: data.user.email },
      emailConfirmationRequired: true
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 