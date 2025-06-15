-- Migration: Add Streamer Invitations Table
-- Similar to admin_invitations but for streamer accounts

-- Streamer invitations table
CREATE TABLE streamer_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_key TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  used_by UUID REFERENCES auth.users(id),
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster key lookups
CREATE INDEX idx_streamer_invitations_key ON streamer_invitations(invitation_key);
CREATE INDEX idx_streamer_invitations_used ON streamer_invitations(is_used);

-- Enable RLS on streamer_invitations
ALTER TABLE streamer_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for streamer_invitations
-- Admins can view all streamer invitations
CREATE POLICY "Admins can view all streamer invitations" ON streamer_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.user_id = auth.uid() 
      AND streamers.role = 'admin'
    )
  );

-- Admins can manage streamer invitations
CREATE POLICY "Admins can manage streamer invitations" ON streamer_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.user_id = auth.uid() 
      AND streamers.role = 'admin'
    )
  );

-- Public can read streamer invitations for validation during registration
CREATE POLICY "Public can validate streamer invitations" ON streamer_invitations
  FOR SELECT USING (is_used = false); 