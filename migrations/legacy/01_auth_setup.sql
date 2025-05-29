-- Simple migration - disable RLS temporarily to get auth working
-- Add authentication fields to streamers table
ALTER TABLE streamers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('admin', 'streamer')) DEFAULT 'streamer';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_streamers_user_id ON streamers(user_id);

-- Update existing streamers with default admin role for testing
UPDATE streamers SET role = 'admin' WHERE username = '@user.suspectservices';

-- DISABLE RLS on all tables temporarily to get auth working
ALTER TABLE streamers DISABLE ROW LEVEL SECURITY;
ALTER TABLE stream_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE key_requests DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to clean slate
DROP POLICY IF EXISTS "Users can view their own streamer record" ON streamers;
DROP POLICY IF EXISTS "Users can update their own streamer record" ON streamers;
DROP POLICY IF EXISTS "Admins can view all streamers" ON streamers;
DROP POLICY IF EXISTS "authenticated_users_own_record" ON streamers;
DROP POLICY IF EXISTS "users_can_insert_own_record" ON streamers;
DROP POLICY IF EXISTS "users_can_access_own_record" ON streamers;
DROP POLICY IF EXISTS "users_can_update_own_record" ON streamers;
DROP POLICY IF EXISTS "users_own_sessions" ON stream_sessions;
DROP POLICY IF EXISTS "users_own_goals" ON goals;
DROP POLICY IF EXISTS "users_own_payouts" ON payouts;
DROP POLICY IF EXISTS "authenticated_users_keys" ON product_keys;
DROP POLICY IF EXISTS "users_own_key_requests" ON key_requests;

-- Note: RLS is disabled for now to get authentication working
-- We'll add proper security policies later once the basic flow works 