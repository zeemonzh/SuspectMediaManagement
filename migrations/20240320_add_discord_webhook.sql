-- Migration: Add system settings table and Discord webhook URL

-- Create system settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  session_timeout_minutes INTEGER DEFAULT 480,
  min_password_length INTEGER DEFAULT 8,
  require_2fa BOOLEAN DEFAULT false,
  max_login_attempts INTEGER DEFAULT 5,
  account_lockout_duration_minutes INTEGER DEFAULT 30,
  discord_webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure we have exactly one row in system settings
INSERT INTO system_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for system_settings
CREATE POLICY "Admins can view system settings" ON system_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.user_id = auth.uid() 
      AND streamers.role = 'admin'
    )
  );

CREATE POLICY "Admins can update system settings" ON system_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.user_id = auth.uid() 
      AND streamers.role = 'admin'
    )
  ); 