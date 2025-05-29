import { NextRequest, NextResponse } from 'next/server'
// Use secure utility that avoids caching issues
const { createSupabaseServerClient } = require('../../../../../lib/supabase-server')

const supabase = createSupabaseServerClient()

// DELETE - Delete an invitation key and any associated admin account
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // First, get the invitation key details
    const { data: key, error: keyError } = await supabase
      .from('invitation_keys')
      .select('*')
      .eq('id', id)
      .single()

    if (keyError) throw keyError
    if (!key) {
      return NextResponse.json(
        { error: 'Invitation key not found' },
        { status: 404 }
      )
    }

    // If the key was used by an admin, we need to delete that admin account
    if (key.used_by && key.used_at) {
      console.log(`Deleting admin account associated with key: ${key.code}`)
      
      // Find the admin account that used this key
      const { data: adminAccount, error: adminError } = await supabase
        .from('streamers')
        .select('user_id')
        .eq('id', key.used_by)
        .eq('role', 'admin')
        .single()

      if (adminAccount && !adminError) {
        // Delete the admin from auth.users (this will cascade to streamers table)
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
          adminAccount.user_id
        )
        
        if (authDeleteError) {
          console.error('Error deleting admin user from auth:', authDeleteError)
          // Continue with key deletion even if admin deletion fails
        } else {
          console.log(`Successfully deleted admin account: ${adminAccount.user_id}`)
        }
      }
    }

    // Now delete the invitation key
    const { error: deleteError } = await supabase
      .from('invitation_keys')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ 
      success: true, 
      message: key.used_by ? 'Invitation key and associated admin account deleted successfully' : 'Invitation key deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting invitation key:', error)
    return NextResponse.json(
      { error: 'Failed to delete invitation key' },
      { status: 500 }
    )
  }
} 