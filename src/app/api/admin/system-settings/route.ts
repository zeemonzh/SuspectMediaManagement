import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch system settings
export async function GET() {
  try {
    // For now, return some default settings
    // This could be expanded to read from a system_settings table
    const defaultSettings = [
      {
        id: '1',
        key: 'platform_name',
        value: 'SuspectCheats',
        description: 'Platform display name',
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        key: 'support_email',
        value: 'support@suspectcheats.com',
        description: 'Support contact email',
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        key: 'registration_mode',
        value: 'invitation',
        description: 'User registration mode (invitation/open/approval)',
        updated_at: new Date().toISOString()
      },
      {
        id: '4',
        key: 'session_timeout',
        value: '480',
        description: 'Session timeout in minutes',
        updated_at: new Date().toISOString()
      },
      {
        id: '5',
        key: 'min_password_length',
        value: '8',
        description: 'Minimum password length',
        updated_at: new Date().toISOString()
      }
    ]

    return NextResponse.json(defaultSettings)
  } catch (error) {
    console.error('Error fetching system settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    )
  }
}

// POST - Update system settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // For now, just return success
    // This could be expanded to actually save settings to database
    console.log('System settings update requested:', body)
    
    return NextResponse.json({ 
      message: 'System settings updated successfully',
      updated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating system settings:', error)
    return NextResponse.json(
      { error: 'Failed to update system settings' },
      { status: 500 }
    )
  }
} 