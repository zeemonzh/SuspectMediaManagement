import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DELETE - Delete a streamer invitation key and any associated streamer account
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // First, get the streamer invitation key details
    const { data: key, error: keyError } = await supabase
      .from('streamer_invitations')
      .select('*')
      .eq('id', id)
      .single()

    if (keyError) throw keyError
    if (!key) {
      return NextResponse.json(
        { error: 'Streamer invitation key not found' },
        { status: 404 }
      )
    }

    // If the key was used by a streamer, we need to delete that streamer account
    if (key.used_by && key.used_at) {
      console.log(`Deleting streamer account associated with key: ${key.invitation_key}`)
      console.log(`Streamer user ID: ${key.used_by}`)
      
      // Find the streamer account that used this key
      const { data: streamerAccount, error: streamerError } = await supabase
        .from('streamers')
        .select('user_id, username, email')
        .eq('user_id', key.used_by)
        .eq('role', 'streamer')
        .single()

      console.log('Streamer lookup result:', { streamerAccount, streamerError })

      if (streamerError) {
        console.error('Error finding streamer account:', streamerError)
        return NextResponse.json(
          { error: `Failed to find streamer account: ${streamerError.message}` },
          { status: 500 }
        )
      }

      if (streamerAccount) {
        // Delete the streamer's auth account
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
          streamerAccount.user_id
        )

        if (authDeleteError) {
          console.error('Error deleting streamer user from auth:', authDeleteError)
          return NextResponse.json(
            { error: `Failed to delete streamer account: ${authDeleteError.message}` },
            { status: 500 }
          )
        } else {
          console.log(`Successfully deleted streamer account: ${streamerAccount.user_id}`)
          
          // Verify the user was actually deleted by trying to get their auth record
          try {
            const { data: checkUser } = await supabase.auth.admin.getUserById(streamerAccount.user_id)
            if (checkUser.user) {
              console.error('User still exists after deletion attempt!')
              return NextResponse.json(
                { error: 'Failed to delete streamer account - user still exists' },
                { status: 500 }
              )
            }
            console.log('Confirmed: Streamer user successfully deleted from auth')
          } catch (verifyError) {
            // This is expected if user was deleted - getUserById should fail
            console.log('Streamer user deletion confirmed (getUserById failed as expected)')
          }
        }
      }
    }

    // Now delete the streamer invitation key
    const { error: deleteError } = await supabase
      .from('streamer_invitations')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ 
      success: true, 
      message: key.used_by ? 'Streamer invitation key and associated streamer account deleted successfully' : 'Streamer invitation key deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting streamer invitation key:', error)
    return NextResponse.json(
      { error: 'Failed to delete streamer invitation key' },
      { status: 500 }
    )
  }
} 