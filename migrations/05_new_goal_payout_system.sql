-- Migration: New Goal and Payout System
-- This updates the system to work with per-stream goals and automatic payout calculation

-- First, let's add new columns to stream_sessions for payout tracking
ALTER TABLE stream_sessions ADD COLUMN IF NOT EXISTS payout_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE stream_sessions ADD COLUMN IF NOT EXISTS meets_time_goal BOOLEAN DEFAULT false;
ALTER TABLE stream_sessions ADD COLUMN IF NOT EXISTS meets_viewer_goal BOOLEAN DEFAULT false;
ALTER TABLE stream_sessions ADD COLUMN IF NOT EXISTS payout_requested BOOLEAN DEFAULT false;
ALTER TABLE stream_sessions ADD COLUMN IF NOT EXISTS payout_request_date TIMESTAMP WITH TIME ZONE;

-- Create new streamer_goals table for individual streamer goal settings
CREATE TABLE IF NOT EXISTS streamer_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID REFERENCES streamers(id) ON DELETE CASCADE,
  minimum_duration_minutes INTEGER DEFAULT 60, -- Default 1 hour
  target_viewers INTEGER DEFAULT 1000, -- Default 1000 viewers
  base_payout DECIMAL(10,2) DEFAULT 7.20, -- Full goal payout
  partial_payout DECIMAL(10,2) DEFAULT 4.50, -- Time goal only payout
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(streamer_id)
);

-- Create payout_requests table for streamer payout requests
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
  status TEXT CHECK (status IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stream_sessions_payout_requested ON stream_sessions(payout_requested);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_streamer ON payout_requests(streamer_id);

-- Insert default goals for all existing streamers
INSERT INTO streamer_goals (streamer_id)
SELECT id FROM streamers WHERE role = 'streamer'
ON CONFLICT (streamer_id) DO NOTHING;

-- Function to calculate payout for a stream session
CREATE OR REPLACE FUNCTION calculate_stream_payout(
  session_duration_minutes INTEGER,
  session_peak_viewers INTEGER,
  session_avg_viewers INTEGER,
  min_duration INTEGER DEFAULT 60,
  target_viewers INTEGER DEFAULT 1000,
  base_payout DECIMAL DEFAULT 7.20,
  partial_payout DECIMAL DEFAULT 4.50
) RETURNS TABLE (
  payout_amount DECIMAL(10,2),
  meets_time_goal BOOLEAN,
  meets_viewer_goal BOOLEAN
) AS $$
BEGIN
  -- Check if time goal is met
  meets_time_goal := session_duration_minutes >= min_duration;
  
  -- Check if viewer goal is met (using average viewers throughout the stream)
  meets_viewer_goal := session_avg_viewers >= target_viewers;
  
  -- Calculate payout amount
  IF NOT meets_time_goal THEN
    -- If doesn't meet minimum time, no payout
    payout_amount := 0.00;
  ELSIF meets_time_goal AND meets_viewer_goal THEN
    -- Full goal met - calculate based on overtime
    payout_amount := base_payout * (session_duration_minutes::DECIMAL / min_duration);
  ELSE
    -- Only time goal met - partial payout with overtime
    payout_amount := partial_payout * (session_duration_minutes::DECIMAL / min_duration);
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically calculate payouts when stream sessions end
CREATE OR REPLACE FUNCTION update_stream_session_payout() RETURNS TRIGGER AS $$
DECLARE
  goals RECORD;
  payout_calc RECORD;
BEGIN
  -- Only calculate when end_time is set and duration is available
  IF NEW.end_time IS NOT NULL AND NEW.duration_minutes IS NOT NULL AND OLD.end_time IS NULL THEN
    
    -- Get the streamer's goal settings
    SELECT * INTO goals 
    FROM streamer_goals 
    WHERE streamer_id = NEW.streamer_id;
    
    -- Use default values if no custom goals set
    IF goals IS NULL THEN
      goals.minimum_duration_minutes := 60;
      goals.target_viewers := 1000;
      goals.base_payout := 7.20;
      goals.partial_payout := 4.50;
    END IF;
    
    -- Calculate payout
    SELECT * INTO payout_calc 
    FROM calculate_stream_payout(
      NEW.duration_minutes,
      NEW.peak_viewers,
      NEW.average_viewers,
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
DROP TRIGGER IF EXISTS trigger_update_stream_session_payout ON stream_sessions;
CREATE TRIGGER trigger_update_stream_session_payout
  BEFORE UPDATE ON stream_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_stream_session_payout();

-- Update existing stream sessions to calculate their payouts
UPDATE stream_sessions 
SET 
  payout_amount = calc.payout_amount,
  meets_time_goal = calc.meets_time_goal,
  meets_viewer_goal = calc.meets_viewer_goal
FROM (
  SELECT 
    ss.id,
    cp.payout_amount,
    cp.meets_time_goal,
    cp.meets_viewer_goal
  FROM stream_sessions ss
  LEFT JOIN streamer_goals sg ON sg.streamer_id = ss.streamer_id
  CROSS JOIN LATERAL calculate_stream_payout(
    COALESCE(ss.duration_minutes, 0),
    COALESCE(ss.peak_viewers, 0),
    COALESCE(ss.average_viewers, 0),
    COALESCE(sg.minimum_duration_minutes, 60),
    COALESCE(sg.target_viewers, 1000),
    COALESCE(sg.base_payout, 7.20),
    COALESCE(sg.partial_payout, 4.50)
  ) cp
  WHERE ss.end_time IS NOT NULL AND ss.duration_minutes IS NOT NULL
) calc
WHERE stream_sessions.id = calc.id; 