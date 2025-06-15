-- Migration: Add Discord webhook URL to system settings

-- Add discord_webhook_url column to system_settings
ALTER TABLE system_settings
ADD COLUMN discord_webhook_url TEXT;

-- Add RLS policy for discord_webhook_url
CREATE POLICY "Admins can view discord webhook URL" ON system_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.user_id = auth.uid() 
      AND streamers.role = 'admin'
    )
  );

CREATE POLICY "Admins can update discord webhook URL" ON system_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.user_id = auth.uid() 
      AND streamers.role = 'admin'
    )
  ); 