-- Migration: Add System Defaults Table
-- Create a table to store system-wide default goals

CREATE TABLE IF NOT EXISTS system_defaults (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default goal settings
INSERT INTO system_defaults (setting_key, setting_value, description) VALUES 
  ('default_goals', '{
    "minimum_duration_minutes": 60,
    "target_viewers": 1000,
    "base_payout": 7.20,
    "partial_payout": 4.50
  }'::jsonb, 'Default goal settings for new streamers')
ON CONFLICT (setting_key) DO NOTHING;

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

-- Update the stream session payout trigger to use system defaults when no streamer goals exist
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

-- Enable RLS on system_defaults
ALTER TABLE system_defaults ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_defaults
-- Everyone can view system defaults
CREATE POLICY "Everyone can view system defaults" ON system_defaults
  FOR SELECT USING (true);

-- Only admins can modify system defaults
CREATE POLICY "Only admins can modify system defaults" ON system_defaults
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM streamers 
      WHERE streamers.user_id = auth.uid() 
      AND streamers.role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_defaults_setting_key ON system_defaults(setting_key); 