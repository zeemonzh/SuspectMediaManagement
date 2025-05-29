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
  "platform_name": "YourPlatformName",      -- Change this to your platform name
  "superadmin_key": "YOUR-CUSTOM-ADMIN-KEY", -- Change this to your preferred admin key
  "currency": "USD",                          -- Change currency (USD, EUR, GBP, etc.)
  "timezone": "UTC"                           -- Set your timezone (UTC, EST, PST, etc.)
}'::jsonb
WHERE setting_key = 'platform_config';

-- ====================================
-- PAYOUT CONFIGURATION
-- ====================================

-- Update default payout goals
-- Adjust these values based on your payout structure
UPDATE system_defaults 
SET setting_value = '{
  "minimum_duration_minutes": 60,    -- Minimum stream duration for any payout
  "target_viewers": 1000,            -- Target viewer count for full payout
  "base_payout": 7.20,               -- Full payout amount when both goals are met
  "partial_payout": 4.50             -- Partial payout when only time goal is met
}'::jsonb
WHERE setting_key = 'default_goals';

-- ====================================
-- PRODUCT CATEGORIES
-- ====================================

-- Clear default categories and add your own
-- Comment out this section if you want to keep the default categories
DELETE FROM product_categories;

-- Add your custom product categories
INSERT INTO product_categories (name, description) VALUES 
  ('Your Game 1 Cheats', 'Description for your first game cheats'),
  ('Your Game 2 Cheats', 'Description for your second game cheats'),
  ('Your Game 3 Cheats', 'Description for your third game cheats');
  -- Add more categories as needed

-- ====================================
-- CUSTOM ADMIN INVITATION KEY
-- ====================================

-- If you changed the superadmin key above, update the invitation key too
-- This should match the superadmin_key in your platform_config
DELETE FROM admin_invitations WHERE invitation_key = 'SUSPECT-SUPERADMIN';

INSERT INTO admin_invitations (invitation_key, created_by, is_used) VALUES 
  ('YOUR-CUSTOM-ADMIN-KEY', NULL, false)  -- This should match your superadmin_key above
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
SELECT 'Product Categories:', json_build_object('categories', array_agg(name))::jsonb
FROM product_categories
UNION ALL
SELECT 'Admin Keys:', json_build_object('keys', array_agg(invitation_key))::jsonb
FROM admin_invitations WHERE is_used = false; 