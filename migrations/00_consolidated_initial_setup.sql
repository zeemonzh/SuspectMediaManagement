-- Consolidated Initial Setup for SuspectCheats Platform
-- This migration creates the complete database schema and initial configuration
-- Environment variables should be set for customization

-- ====================================
-- 1. CORE SCHEMA
-- ====================================

-- Streamers table (enhanced from initial schema)
CREATE TABLE IF NOT EXISTS streamers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username TEXT UNIQUE NOT NULL,
  tiktok_username TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('streamer', 'admin')) DEFAULT 'streamer',
  paypal_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Stream sessions table
CREATE TABLE IF NOT EXISTS stream_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID REFERENCES streamers(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  peak_viewers INTEGER DEFAULT 0,
  average_viewers INTEGER DEFAULT 0,
  current_viewers INTEGER DEFAULT 0,
  total_viewers INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  payout_amount DECIMAL(10,2) DEFAULT 0,
  meets_time_goal BOOLEAN DEFAULT false,
  meets_viewer_goal BOOLEAN DEFAULT false,
  payout_requested BOOLEAN DEFAULT false,
  payout_request_date TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product keys table
CREATE TABLE IF NOT EXISTS product_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
  is_assigned BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES streamers(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Key requests table
CREATE TABLE IF NOT EXISTS key_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID REFERENCES streamers(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
  admin_notes TEXT,
  assigned_key_id UUID REFERENCES product_keys(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goals table (legacy)
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID REFERENCES streamers(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: YYYY-MM
  target_hours INTEGER NOT NULL,
  target_viewers INTEGER NOT NULL,
  current_hours INTEGER DEFAULT 0,
  current_avg_viewers INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payouts table (legacy)
CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID REFERENCES streamers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  month TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
  calculated_amount DECIMAL(10,2) NOT NULL,
  admin_notes TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Streamer goals table
CREATE TABLE IF NOT EXISTS streamer_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID REFERENCES streamers(id) ON DELETE CASCADE UNIQUE,
  minimum_duration_minutes INTEGER NOT NULL,
  target_viewers INTEGER NOT NULL,
  base_payout DECIMAL(10,2) NOT NULL,
  partial_payout DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payout requests table
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID REFERENCES streamers(id) ON DELETE CASCADE,
  stream_session_id UUID REFERENCES stream_sessions(id) ON DELETE CASCADE,
  requested_amount DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  peak_viewers INTEGER NOT NULL,
  average_viewers INTEGER NOT NULL,
  meets_time_goal BOOLEAN NOT NULL,
  meets_viewer_goal BOOLEAN NOT NULL,
  month TEXT,
  total_sessions INTEGER DEFAULT 0,
  total_hours DECIMAL(10,2) DEFAULT 0,
  sessions_meeting_goals INTEGER DEFAULT 0,
  calculated_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'approved', 'paid', 'denied')) DEFAULT 'pending',
  payout_method TEXT DEFAULT 'paypal',
  paypal_username TEXT,
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin invitations table
CREATE TABLE IF NOT EXISTS admin_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_key TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- System defaults table
CREATE TABLE IF NOT EXISTS system_defaults (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================
-- 2. INDEXES FOR PERFORMANCE
-- ====================================

-- Streamers indexes
CREATE INDEX IF NOT EXISTS idx_streamers_user_id ON streamers(user_id);
CREATE INDEX IF NOT EXISTS idx_streamers_role ON streamers(role);
CREATE INDEX IF NOT EXISTS idx_streamers_active ON streamers(is_active);

-- Stream sessions indexes
CREATE INDEX IF NOT EXISTS idx_stream_sessions_streamer_id ON stream_sessions(streamer_id);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_start_time ON stream_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_end_time ON stream_sessions(end_time);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_payout_requested ON stream_sessions(payout_requested);

-- Product keys indexes
CREATE INDEX IF NOT EXISTS idx_product_keys_category_id ON product_keys(category_id);
CREATE INDEX IF NOT EXISTS idx_product_keys_assigned ON product_keys(is_assigned);
CREATE INDEX IF NOT EXISTS idx_product_keys_assigned_to ON product_keys(assigned_to);
CREATE INDEX IF NOT EXISTS idx_product_keys_key ON product_keys(key);

-- Key requests indexes
CREATE INDEX IF NOT EXISTS idx_key_requests_streamer_id ON key_requests(streamer_id);
CREATE INDEX IF NOT EXISTS idx_key_requests_status ON key_requests(status);
CREATE INDEX IF NOT EXISTS idx_key_requests_category_id ON key_requests(category_id);

-- Goals indexes (legacy)
CREATE INDEX IF NOT EXISTS idx_goals_streamer_id ON goals(streamer_id);
CREATE INDEX IF NOT EXISTS idx_goals_month ON goals(month);

-- Payouts indexes (legacy)
CREATE INDEX IF NOT EXISTS idx_payouts_streamer_id ON payouts(streamer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_month ON payouts(month);

-- Streamer goals indexes
CREATE INDEX IF NOT EXISTS idx_streamer_goals_streamer_id ON streamer_goals(streamer_id);

-- Payout requests indexes
CREATE INDEX IF NOT EXISTS idx_payout_requests_streamer_id ON payout_requests(streamer_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_stream_session_id ON payout_requests(stream_session_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_paid_at ON payout_requests(paid_at);
CREATE INDEX IF NOT EXISTS idx_payout_requests_paypal ON payout_requests(paypal_username);

-- Admin invitations indexes
CREATE INDEX IF NOT EXISTS idx_admin_invitations_key ON admin_invitations(invitation_key);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_used ON admin_invitations(is_used);

-- System defaults indexes
CREATE INDEX IF NOT EXISTS idx_system_defaults_setting_key ON system_defaults(setting_key);

-- ====================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ====================================

-- Enable RLS on all tables
ALTER TABLE streamers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamer_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_defaults ENABLE ROW LEVEL SECURITY;

-- Streamers RLS policies
CREATE POLICY "Users can view own streamer record" ON streamers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streamer record" ON streamers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all streamers" ON streamers
  FOR ALL USING (current_setting('role') = 'service_role');

-- Stream sessions RLS policies
CREATE POLICY "Streamers can manage own sessions" ON stream_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.id = stream_sessions.streamer_id 
      AND streamers.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all sessions" ON stream_sessions
  FOR ALL USING (current_setting('role') = 'service_role');

-- Product categories RLS policies
CREATE POLICY "Everyone can view product categories" ON product_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage product categories" ON product_categories
  FOR ALL USING (current_setting('role') = 'service_role');

-- Product keys RLS policies
CREATE POLICY "Service role can manage product keys" ON product_keys
  FOR ALL USING (current_setting('role') = 'service_role');

-- Key requests RLS policies
CREATE POLICY "Streamers can manage own key requests" ON key_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.id = key_requests.streamer_id 
      AND streamers.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all key requests" ON key_requests
  FOR ALL USING (current_setting('role') = 'service_role');

-- Streamer goals RLS policies
CREATE POLICY "Streamers can view own goals" ON streamer_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.id = streamer_goals.streamer_id 
      AND streamers.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all goals" ON streamer_goals
  FOR ALL USING (current_setting('role') = 'service_role');

-- Payout requests RLS policies
CREATE POLICY "Streamers can manage own payout requests" ON payout_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.id = payout_requests.streamer_id 
      AND streamers.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all payout requests" ON payout_requests
  FOR ALL USING (current_setting('role') = 'service_role');

-- Admin invitations RLS policies
CREATE POLICY "Public can validate admin invitations" ON admin_invitations
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage admin invitations" ON admin_invitations
  FOR ALL USING (current_setting('role') = 'service_role');

-- System defaults RLS policies
CREATE POLICY "Everyone can view system defaults" ON system_defaults
  FOR SELECT USING (true);

CREATE POLICY "Service role can modify system defaults" ON system_defaults
  FOR ALL USING (current_setting('role') = 'service_role');

-- Goals RLS policies (legacy)
CREATE POLICY "Streamers can view own goals" ON goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.id = goals.streamer_id 
      AND streamers.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all goals" ON goals
  FOR ALL USING (current_setting('role') = 'service_role');

-- Payouts RLS policies (legacy)
CREATE POLICY "Streamers can view own payouts" ON payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.id = payouts.streamer_id 
      AND streamers.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all payouts" ON payouts
  FOR ALL USING (current_setting('role') = 'service_role');

-- ====================================
-- 4. SYSTEM CONFIGURATION
-- ====================================

-- Insert default product categories first
INSERT INTO product_categories (name, description, is_active) VALUES 
  ('Premium Cheat Package', 'High-tier cheats with advanced features', true),
  ('VIP Access Package', 'VIP membership and exclusive access', true),
  ('Elite Membership', 'Elite tier with all features', true),
  ('Test Package', 'Testing and development keys', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- Insert configurable default system settings
INSERT INTO system_defaults (setting_key, setting_value, description) VALUES 
  ('default_goals', '{
    "minimum_duration_minutes": 60,
    "target_viewers": 1000,
    "base_payout": 7.20,
    "partial_payout": 4.50
  }'::jsonb, 'Default goal settings for new streamers'),
  
  ('platform_config', '{
    "platform_name": "SuspectCheats",
    "superadmin_key": "SUSPECT-SUPERADMIN",
    "currency": "USD",
    "timezone": "GMT+2"
  }'::jsonb, 'Platform configuration settings')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert the bootstrap superadmin invitation key using configurable value
INSERT INTO admin_invitations (invitation_key, created_by, is_used) 
SELECT 
  (setting_value->>'superadmin_key')::TEXT,
  NULL,
  false
FROM system_defaults 
WHERE setting_key = 'platform_config'
ON CONFLICT (invitation_key) DO NOTHING;

-- ====================================
-- 5. HELPER FUNCTIONS
-- ====================================

-- Function to get system default goals
CREATE OR REPLACE FUNCTION get_system_default_goals()
RETURNS TABLE (
  minimum_duration_minutes INTEGER,
  target_viewers INTEGER,
  base_payout DECIMAL(10,2),
  partial_payout DECIMAL(10,2)
) AS $$
DECLARE
  defaults JSONB;
BEGIN
  SELECT setting_value INTO defaults 
  FROM system_defaults 
  WHERE setting_key = 'default_goals';
  
  IF defaults IS NULL THEN
    -- Fallback to hardcoded defaults if no system defaults exist
    minimum_duration_minutes := 60;
    target_viewers := 1000;
    base_payout := 7.20;
    partial_payout := 4.50;
  ELSE
    minimum_duration_minutes := (defaults->>'minimum_duration_minutes')::INTEGER;
    target_viewers := (defaults->>'target_viewers')::INTEGER;
    base_payout := (defaults->>'base_payout')::DECIMAL(10,2);
    partial_payout := (defaults->>'partial_payout')::DECIMAL(10,2);
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate stream payout
CREATE OR REPLACE FUNCTION calculate_stream_payout(
  duration_mins INTEGER,
  peak_viewers_count INTEGER,
  avg_viewers_count INTEGER,
  total_viewers_count INTEGER,
  min_duration INTEGER,
  target_viewers INTEGER,
  base_amount DECIMAL(10,2),
  partial_amount DECIMAL(10,2)
)
RETURNS TABLE (
  payout_amount DECIMAL(10,2),
  meets_time_goal BOOLEAN,
  meets_viewer_goal BOOLEAN
) AS $$
BEGIN
  meets_time_goal := duration_mins >= min_duration;
  meets_viewer_goal := GREATEST(peak_viewers_count, avg_viewers_count, total_viewers_count) >= target_viewers;
  
  IF meets_time_goal AND meets_viewer_goal THEN
    payout_amount := base_amount;
  ELSIF meets_time_goal THEN
    payout_amount := partial_amount;
  ELSE
    payout_amount := 0;
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate stream session payouts
CREATE OR REPLACE FUNCTION update_stream_session_payout() RETURNS TRIGGER AS $$
DECLARE
  goals RECORD;
  system_defaults RECORD;
  payout_calc RECORD;
BEGIN
  -- Only calculate when end_time is set and duration is available
  IF NEW.end_time IS NOT NULL AND NEW.duration_minutes IS NOT NULL AND OLD.end_time IS NULL THEN
    
    -- Get the streamer's goal settings
    SELECT * INTO goals 
    FROM streamer_goals 
    WHERE streamer_id = NEW.streamer_id;
    
    -- If no custom goals, use system defaults
    IF goals IS NULL THEN
      SELECT * INTO system_defaults FROM get_system_default_goals();
      
      goals.minimum_duration_minutes := system_defaults.minimum_duration_minutes;
      goals.target_viewers := system_defaults.target_viewers;
      goals.base_payout := system_defaults.base_payout;
      goals.partial_payout := system_defaults.partial_payout;
    END IF;
    
    -- Calculate payout
    SELECT * INTO payout_calc 
    FROM calculate_stream_payout(
      NEW.duration_minutes,
      NEW.peak_viewers,
      NEW.average_viewers,
      COALESCE(NEW.total_viewers, 0),
      goals.minimum_duration_minutes,
      goals.target_viewers,
      goals.base_payout,
      goals.partial_payout
    );
    
    -- Update the session with payout information
    NEW.payout_amount := payout_calc.payout_amount;
    NEW.meets_time_goal := payout_calc.meets_time_goal;
    NEW.meets_viewer_goal := payout_calc.meets_viewer_goal;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_update_stream_session_payout ON stream_sessions;
CREATE TRIGGER trg_update_stream_session_payout
  BEFORE UPDATE ON stream_sessions
  FOR EACH ROW EXECUTE FUNCTION update_stream_session_payout();

-- Setup complete
SELECT 'Database setup completed successfully!' as status; 