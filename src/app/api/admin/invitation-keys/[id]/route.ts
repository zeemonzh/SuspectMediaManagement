import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DELETE - Delete an admin invitation key and any associated admin account
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // First, get the admin invitation key details
    const { data: key, error: keyError } = await supabase
      .from('admin_invitations')
      .select('*')
      .eq('id', id)
      .single()

    if (keyError) throw keyError
    if (!key) {
      return NextResponse.json(
        { error: 'Admin invitation key not found' },
        { status: 404 }
      )
    }

    // If the key was used by an admin, we need to delete that admin account
    if (key.used_by && key.used_at) {
      console.log(`Deleting admin account associated with key: ${key.invitation_key}`)
      console.log(`Admin user ID: ${key.used_by}`)
      
      // Find the admin account that used this key
      const { data: adminAccount, error: adminError } = await supabase
        .from('streamers')
        .select('user_id, username, email')
        .eq('user_id', key.used_by)
        .eq('role', 'admin')
        .single()

      console.log('Admin lookup result:', { adminAccount, adminError })

      if (adminError) {
        console.error('Error finding admin account:', adminError)
        return NextResponse.json(
          { error: `Failed to find admin account: ${adminError.message}` },
          { status: 500 }
        )
      }

      if (!adminAccount) {
        console.warn('Admin account not found in streamers table')
        // Continue with key deletion even if admin account not found
      } else {
        console.log(`Found admin account: ${adminAccount.username} (${adminAccount.email})`)
        
        // First, clean up any foreign key relationships that prevent user deletion
        console.log('Cleaning up foreign key relationships...')
        
        // Update any admin_invitations records that reference this user
        const { error: cleanupError } = await supabase
          .from('admin_invitations')
          .update({ 
            created_by: null,
            used_by: null 
          })
          .or(`created_by.eq.${adminAccount.user_id},used_by.eq.${adminAccount.user_id}`)
        
        if (cleanupError) {
          console.error('Error cleaning up admin_invitations references:', cleanupError)
          return NextResponse.json(
            { error: `Failed to cleanup foreign key references: ${cleanupError.message}` },
            { status: 500 }
          )
        }
        
        console.log('Successfully cleaned up foreign key relationships')
        
        // Delete the admin from auth.users (this should now cascade to streamers table)
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
          adminAccount.user_id
        )
        
        if (authDeleteError) {
          console.error('Error deleting admin user from auth:', authDeleteError)
          return NextResponse.json(
            { error: `Failed to delete admin account: ${authDeleteError.message}` },
            { status: 500 }
          )
        } else {
          console.log(`Successfully deleted admin account: ${adminAccount.user_id}`)
          
          // Verify the user was actually deleted by trying to get their auth record
          try {
            const { data: checkUser } = await supabase.auth.admin.getUserById(adminAccount.user_id)
            if (checkUser.user) {
              console.error('User still exists after deletion attempt!')
              return NextResponse.json(
                { error: 'Failed to delete admin account - user still exists' },
                { status: 500 }
              )
            }
            console.log('Confirmed: Admin user successfully deleted from auth')
          } catch (verifyError) {
            // This is expected if user was deleted - getUserById should fail
            console.log('Admin user deletion confirmed (getUserById failed as expected)')
          }
        }
      }
    }

    // Now delete the admin invitation key
    const { error: deleteError } = await supabase
      .from('admin_invitations')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ 
      success: true, 
      message: key.used_by ? 'Admin invitation key and associated admin account deleted successfully' : 'Admin invitation key deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting admin invitation key:', error)
    return NextResponse.json(
      { error: 'Failed to delete admin invitation key' },
      { status: 500 }
    )
  }
} 