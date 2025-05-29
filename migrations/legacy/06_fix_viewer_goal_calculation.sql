-- Migration: Fix Viewer Goal Calculation
-- This updates the payout calculation to use average viewers instead of peak viewers

-- Update the payout calculation function to use average viewers
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
    COALESCE(sg.minimum_duration_minutes, 60),
    COALESCE(sg.target_viewers, 1000),
    COALESCE(sg.base_payout, 7.20),
    COALESCE(sg.partial_payout, 4.50)
  ) cp
  WHERE ss.end_time IS NOT NULL AND ss.duration_minutes IS NOT NULL
) calc
WHERE stream_sessions.id = calc.id; 