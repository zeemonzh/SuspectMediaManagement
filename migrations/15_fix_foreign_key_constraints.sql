-- Migration: Fix Foreign Key Constraints for Streamer Deletion
-- This updates all foreign key constraints to properly handle CASCADE DELETE

-- First, drop existing foreign key constraints
ALTER TABLE stream_sessions DROP CONSTRAINT IF EXISTS stream_sessions_streamer_id_fkey;
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_streamer_id_fkey;
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_streamer_id_fkey;
ALTER TABLE product_keys DROP CONSTRAINT IF EXISTS product_keys_assigned_to_fkey;
ALTER TABLE key_requests DROP CONSTRAINT IF EXISTS key_requests_streamer_id_fkey;

-- Recreate foreign key constraints with proper CASCADE DELETE behavior
ALTER TABLE stream_sessions 
ADD CONSTRAINT stream_sessions_streamer_id_fkey 
FOREIGN KEY (streamer_id) REFERENCES streamers(id) ON DELETE CASCADE;

ALTER TABLE goals 
ADD CONSTRAINT goals_streamer_id_fkey 
FOREIGN KEY (streamer_id) REFERENCES streamers(id) ON DELETE CASCADE;

ALTER TABLE payouts 
ADD CONSTRAINT payouts_streamer_id_fkey 
FOREIGN KEY (streamer_id) REFERENCES streamers(id) ON DELETE CASCADE;

ALTER TABLE product_keys 
ADD CONSTRAINT product_keys_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES streamers(id) ON DELETE SET NULL;

ALTER TABLE key_requests 
ADD CONSTRAINT key_requests_streamer_id_fkey 
FOREIGN KEY (streamer_id) REFERENCES streamers(id) ON DELETE CASCADE;

-- Note: invitation_keys table already has proper constraints (SET NULL for created_by/used_by)
-- Note: streamer_goals and payout_requests tables already have CASCADE DELETE from migration 05 