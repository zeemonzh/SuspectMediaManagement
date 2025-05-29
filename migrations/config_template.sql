-- Configuration Template for SuspectCheats Platform
-- Copy this file, customize the values, and run it AFTER the main migration
-- Or edit the values directly in 00_consolidated_initial_setup.sql before running it

-- ====================================
-- PLATFORM CONFIGURATION
-- ====================================

-- Update platform configuration
-- Change these values to match your setup
UPDATE system_defaults 
SET setting_value = '{
  "platform_name": "SuspectCheats",
  "superadmin_key": "SUSPECT-SUPERADMIN",
  "currency": "USD",
  "timezone": "GMT+2"
}'::jsonb
WHERE setting_key = 'platform_config';

-- ====================================
-- PAYOUT CONFIGURATION
-- ====================================

-- Update default payout goals
-- Adjust these values based on your payout structure
UPDATE system_defaults 
SET setting_value = '{
  "minimum_duration_minutes": 60,
  "target_viewers": 1000,
  "base_payout": 7.20,
  "partial_payout": 4.50
}'::jsonb
WHERE setting_key = 'default_goals';

-- ====================================
-- CUSTOM ADMIN INVITATION KEY
-- ====================================

-- If you changed the superadmin key above, update the invitation key too
-- This should match the superadmin_key in your platform_config
DELETE FROM admin_invitations WHERE invitation_key = 'SUSPECT-SUPERADMIN';

INSERT INTO admin_invitations (invitation_key, created_by, is_used) VALUES 
  ('SUSPECT-SUPERADMIN', NULL, false)  -- This should match your superadmin_key above
ON CONFLICT (invitation_key) DO NOTHING;

-- ====================================
-- VERIFICATION
-- ====================================

-- Verify your configuration was applied
SELECT 'Platform Configuration:' as section, setting_value 
FROM system_defaults WHERE setting_key = 'platform_config'
UNION ALL
SELECT 'Default Goals:', setting_value 
FROM system_defaults WHERE setting_key = 'default_goals'
UNION ALL
SELECT 'Admin Keys:', json_build_object('keys', array_agg(invitation_key))::jsonb
FROM admin_invitations WHERE is_used = false; 