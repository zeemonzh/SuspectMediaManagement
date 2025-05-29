-- Migration: Fix Total Viewers Goal Calculation
-- This updates the payout calculation to use total viewers instead of average viewers

-- Add total_viewers column to stream_sessions table
ALTER TABLE stream_sessions ADD COLUMN IF NOT EXISTS total_viewers INTEGER DEFAULT 0;

-- Update the payout calculation function to use total viewers
CREATE OR REPLACE FUNCTION calculate_stream_payout(
  session_duration_minutes INTEGER,
  session_peak_viewers INTEGER,
  session_avg_viewers INTEGER,
  session_total_viewers INTEGER,
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
  
  -- Check if viewer goal is met (using total viewers throughout the stream)
  meets_viewer_goal := session_total_viewers >= target_viewers;
  
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

-- Update the trigger function to use the new calculation with total viewers
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

-- For existing sessions, estimate total viewers as average_viewers * (duration_minutes / 10)
-- This is a rough estimate - new streams will track actual total viewers
UPDATE stream_sessions 
SET total_viewers = COALESCE(average_viewers * GREATEST(duration_minutes / 10, 1), 0)
WHERE total_viewers = 0 AND end_time IS NOT NULL;

-- Recalculate all existing stream sessions with the updated logic
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
    COALESCE(ss.total_viewers, 0),
    COALESCE(sg.minimum_duration_minutes, 60),
    COALESCE(sg.target_viewers, 1000),
    COALESCE(sg.base_payout, 7.20),
    COALESCE(sg.partial_payout, 4.50)
  ) cp
  WHERE ss.end_time IS NOT NULL AND ss.duration_minutes IS NOT NULL
) calc
WHERE stream_sessions.id = calc.id; 