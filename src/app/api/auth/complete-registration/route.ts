import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    console.log('Completing registration for user:', userId)

    // Get the user and their metadata
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError || !user) {
      console.error('Error fetching user:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user email is confirmed
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Email not confirmed yet' },
        { status: 400 }
      )
    }

    // Check if profile already exists (more robust check)
    const { data: existingStreamer, error: checkError } = await supabase
      .from('streamers')
      .select('id, username, role, email')
      .eq('user_id', userId)
      .single()

    if (existingStreamer) {
      console.log('Profile already exists for user:', userId)
      return NextResponse.json({ 
        success: true,
        message: 'Profile already exists',
        profile: {
          username: existingStreamer.username,
          role: existingStreamer.role,
          email: existingStreamer.email
        }
      })
    }

    // Only proceed if no profile exists
    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "no rows found" which is expected
      console.error('Error checking existing profile:', checkError)
      return NextResponse.json(
        { error: 'Error checking existing profile' },
        { status: 500 }
      )
    }

    // Get registration data from user metadata
    const metadata = user.user_metadata || {}
    const { role, username, tiktokUsername, invitationKey } = metadata

    if (!role || !username) {
      console.error('Missing registration metadata for user:', userId)
      return NextResponse.json(
        { error: 'Missing registration data. Please contact support.' },
        { status: 400 }
      )
    }

    console.log('Creating streamer profile for:', username, 'as role:', role)

    // Create streamer record using service role (bypasses RLS)
    const { error: streamerError } = await supabase
      .from('streamers')
      .insert({
        user_id: userId,
        username: username,
        tiktok_username: role === 'streamer' ? (tiktokUsername || '') : null,
        email: user.email,
        role: role,
        is_active: true
      })

    if (streamerError) {
      // If it's a duplicate key error, that's actually fine - profile already exists
      if (streamerError.code === '23505') {
        console.log('Profile was created by another request (race condition), checking again...')
        
        // Fetch the existing profile
        const { data: newExistingStreamer } = await supabase
          .from('streamers')
          .select('username, role, email')
          .eq('user_id', userId)
          .single()

        if (newExistingStreamer) {
          return NextResponse.json({ 
            success: true,
            message: 'Profile created successfully (by concurrent request)',
            profile: {
              username: newExistingStreamer.username,
              role: newExistingStreamer.role,
              email: newExistingStreamer.email
            }
          })
        }
      }
      
      console.error('Error creating streamer record:', streamerError)
      return NextResponse.json(
        { error: 'Failed to create user profile: ' + streamerError.message },
        { status: 500 }
      )
    }

    console.log('Streamer record created successfully')

    // Mark invitation key as used for admin and streamer accounts
    if ((role === 'admin' || role === 'streamer') && invitationKey) {
      console.log(`Marking ${role} invitation key as used...`)
      const { error: keyUpdateError } = await supabase
        .from(role === 'admin' ? 'admin_invitations' : 'streamer_invitations')
        .update({
          used_by: userId,
          is_used: true,
          used_at: new Date().toISOString()
        })
        .eq('invitation_key', invitationKey)

      if (keyUpdateError) {
        console.error('Error marking invitation key as used:', keyUpdateError)
        // Don't fail registration for this, just log it
      } else {
        console.log('Invitation key marked as used successfully')
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Profile created successfully',
      profile: {
        username,
        role,
        email: user.email
      }
    })

  } catch (error) {
    console.error('Complete registration API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 