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
  discord_webhook_url?: string
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
    const settings: SecuritySettings = await request.json()

    // Validate settings
    if (
      settings.session_timeout_minutes < 5 ||
      settings.session_timeout_minutes > 1440 ||
      settings.min_password_length < 8 ||
      settings.min_password_length > 32 ||
      settings.max_login_attempts < 3 ||
      settings.max_login_attempts > 10 ||
      settings.account_lockout_duration_minutes < 5 ||
      settings.account_lockout_duration_minutes > 1440
    ) {
      return NextResponse.json(
        { error: 'Invalid settings values' },
        { status: 400 }
      )
    }

    // Validate Discord webhook URL if provided
    if (settings.discord_webhook_url && !settings.discord_webhook_url.startsWith('https://discord.com/api/webhooks/')) {
      return NextResponse.json(
        { error: 'Invalid Discord webhook URL' },
        { status: 400 }
      )
    }

    // Update settings
    const { error } = await supabase
      .from('system_settings')
      .update({
        session_timeout_minutes: settings.session_timeout_minutes,
        min_password_length: settings.min_password_length,
        require_2fa: settings.require_2fa,
        max_login_attempts: settings.max_login_attempts,
        account_lockout_duration_minutes: settings.account_lockout_duration_minutes,
        discord_webhook_url: settings.discord_webhook_url || null
      })
      .eq('id', 1) // We only have one row in system_settings

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating security settings:', error)
    return NextResponse.json(
      { error: 'Failed to update security settings' },
      { status: 500 }
    )
  }
} 