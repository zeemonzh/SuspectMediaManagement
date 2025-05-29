import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH - Update streamer
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { id } = params

    const { data: streamer, error } = await supabase
      .from('streamers')
      .update(body)
      .eq('id', id)
      .eq('role', 'streamer')
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(streamer)
  } catch (error) {
    console.error('Error updating streamer:', error)
    return NextResponse.json(
      { error: 'Failed to update streamer' },
      { status: 500 }
    )
  }
}

// DELETE - Delete user (streamer or admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // First get the user to see what we're deleting
    const { data: user, error: getUserError } = await supabase
      .from('streamers')
      .select('user_id, username, role')
      .eq('id', id)
      .single()

    if (getUserError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete the user from auth.users (this will cascade to streamers table due to foreign key)
    if (user.user_id) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        user.user_id
      )

      if (authDeleteError) {
        console.error('Error deleting user from auth:', authDeleteError)
        return NextResponse.json(
          { error: 'Failed to delete user account' },
          { status: 500 }
        )
      }
    }

    // The streamer record will be automatically deleted due to CASCADE DELETE
    // No need to explicitly delete from streamers table

    return NextResponse.json({ 
      success: true, 
      message: `${user.role} "${user.username}" deleted successfully` 
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}