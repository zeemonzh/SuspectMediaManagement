-- Admin invitation system
-- Only users with valid invitation keys can create admin accounts

-- Admin invitations table
CREATE TABLE admin_invitations (
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
CREATE INDEX idx_admin_invitations_key ON admin_invitations(invitation_key);
CREATE INDEX idx_admin_invitations_used ON admin_invitations(is_used);

-- Admin invitation keys will be generated through the admin panel

-- Disable RLS on admin_invitations table for now
ALTER TABLE admin_invitations DISABLE ROW LEVEL SECURITY; 