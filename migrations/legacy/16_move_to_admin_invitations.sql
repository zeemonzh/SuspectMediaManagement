-- Migration: Move invitation keys to admin_invitations table
-- This fixes the invitation system to use the correct table

-- First, migrate any existing keys from invitation_keys to admin_invitations
-- Only migrate keys that don't already exist in admin_invitations
INSERT INTO admin_invitations (invitation_key, created_by, used_by, is_used, created_at, used_at)
SELECT 
  code as invitation_key,
  NULL as created_by, -- Most keys are system-generated
  CASE 
    WHEN used_by IS NOT NULL THEN (
      SELECT user_id FROM streamers WHERE id = invitation_keys.used_by LIMIT 1
    )
    ELSE NULL
  END as used_by,
  CASE WHEN used_at IS NOT NULL THEN true ELSE false END as is_used,
  created_at,
  used_at
FROM invitation_keys
WHERE NOT EXISTS (
  SELECT 1 FROM admin_invitations 
  WHERE admin_invitations.invitation_key = invitation_keys.code
);

-- Enable RLS on admin_invitations for better security
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_invitations
-- Admins can view all admin invitations
CREATE POLICY "Admins can view all admin invitations" ON admin_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.user_id = auth.uid() 
      AND streamers.role = 'admin'
    )
  );

-- Admins can manage admin invitations
CREATE POLICY "Admins can manage admin invitations" ON admin_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.user_id = auth.uid() 
      AND streamers.role = 'admin'
    )
  );

-- Public can read admin invitations for validation during registration
CREATE POLICY "Public can validate admin invitations" ON admin_invitations
  FOR SELECT USING (is_used = false);

-- Insert the bootstrap superuser key if it doesn't exist
INSERT INTO admin_invitations (invitation_key, created_by, is_used) 
VALUES ('SUSPECT-SUPERADMIN', NULL, false)
ON CONFLICT (invitation_key) DO NOTHING;

-- Now we can safely drop the old invitation_keys table and its policies
DROP POLICY IF EXISTS "Admins can view all invitation keys" ON invitation_keys;
DROP POLICY IF EXISTS "Admins can manage invitation keys" ON invitation_keys;
DROP POLICY IF EXISTS "Public can validate invitation keys" ON invitation_keys;

-- Drop the function that was specific to invitation_keys
DROP FUNCTION IF EXISTS use_invitation_key(TEXT, UUID);

-- Drop the invitation_keys table
DROP TABLE IF EXISTS invitation_keys; 