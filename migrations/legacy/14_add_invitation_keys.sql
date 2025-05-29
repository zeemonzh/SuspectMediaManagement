-- Migration: Add Invitation Keys Table
-- Create a table to manage invitation-only registration

CREATE TABLE IF NOT EXISTS invitation_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES streamers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES streamers(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitation_keys_code ON invitation_keys(code);
CREATE INDEX IF NOT EXISTS idx_invitation_keys_active ON invitation_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_invitation_keys_created_by ON invitation_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_invitation_keys_used_by ON invitation_keys(used_by);

-- Enable RLS on invitation_keys
ALTER TABLE invitation_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitation_keys
-- Admins can view all invitation keys
CREATE POLICY "Admins can view all invitation keys" ON invitation_keys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.user_id = auth.uid() 
      AND streamers.role = 'admin'
    )
  );

-- Admins can manage invitation keys
CREATE POLICY "Admins can manage invitation keys" ON invitation_keys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.user_id = auth.uid() 
      AND streamers.role = 'admin'
    )
  );

-- Public can read invitation keys for validation during registration
CREATE POLICY "Public can validate invitation keys" ON invitation_keys
  FOR SELECT USING (is_active = true AND used_at IS NULL);

-- Function to validate and mark invitation key as used
CREATE OR REPLACE FUNCTION use_invitation_key(key_code TEXT, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  key_record RECORD;
BEGIN
  -- Check if key exists and is valid
  SELECT * INTO key_record 
  FROM invitation_keys 
  WHERE code = key_code 
    AND is_active = true 
    AND used_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Mark key as used
  UPDATE invitation_keys 
  SET 
    used_at = NOW(),
    used_by = user_id,
    updated_at = NOW()
  WHERE id = key_record.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert one bootstrap invitation key for creating the initial superuser
INSERT INTO invitation_keys (code, created_by) VALUES 
  ('SUSPECT-SUPERADMIN', NULL)
ON CONFLICT (code) DO NOTHING; 