import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Prevent route caching
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SecuritySettings {
  session_timeout_minutes: number
  min_password_length: number
  require_2fa: boolean
  max_login_attempts: number
  account_lockout_duration_minutes: number
}

// GET - Fetch current security settings
export async function GET() {
  try {
    const { data: settings, error } = await supabase
      .from('system_defaults')
      .select('*')
      .eq('setting_key', 'security_settings')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // Return default settings if none exist
    const defaultSettings: SecuritySettings = {
      session_timeout_minutes: 480, // 8 hours
      min_password_length: 8,
      require_2fa: false,
      max_login_attempts: 5,
      account_lockout_duration_minutes: 30
    }

    const currentSettings = settings?.setting_value as SecuritySettings || defaultSettings

    return NextResponse.json(currentSettings)
  } catch (error) {
    console.error('Error fetching security settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security settings' },
      { status: 500 }
    )
  }
}

// POST - Update security settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      session_timeout_minutes,
      min_password_length,
      require_2fa,
      max_login_attempts,
      account_lockout_duration_minutes
    } = body

    // Validate inputs
    if (session_timeout_minutes < 30 || session_timeout_minutes > 1440) {
      return NextResponse.json(
        { error: 'Session timeout must be between 30 and 1440 minutes' },
        { status: 400 }
      )
    }

    if (min_password_length < 6 || min_password_length > 50) {
      return NextResponse.json(
        { error: 'Password length must be between 6 and 50 characters' },
        { status: 400 }
      )
    }

    if (max_login_attempts < 3 || max_login_attempts > 20) {
      return NextResponse.json(
        { error: 'Max login attempts must be between 3 and 20' },
        { status: 400 }
      )
    }

    if (account_lockout_duration_minutes < 5 || account_lockout_duration_minutes > 1440) {
      return NextResponse.json(
        { error: 'Account lockout duration must be between 5 and 1440 minutes' },
        { status: 400 }
      )
    }

    const securitySettings: SecuritySettings = {
      session_timeout_minutes,
      min_password_length,
      require_2fa: Boolean(require_2fa),
      max_login_attempts,
      account_lockout_duration_minutes
    }

    // Upsert the security settings
    const { data: settings, error } = await supabase
      .from('system_defaults')
      .upsert({
        setting_key: 'security_settings',
        setting_value: securitySettings,
        description: 'Security and authentication settings for the platform',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(securitySettings, { status: 200 })
  } catch (error) {
    console.error('Error updating security settings:', error)
    return NextResponse.json(
      { error: 'Failed to update security settings' },
      { status: 500 }
    )
  }
} 