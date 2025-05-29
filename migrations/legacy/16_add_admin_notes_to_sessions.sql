-- Migration: Add admin_notes column to stream_sessions table
-- This allows admins to add notes about stream sessions

ALTER TABLE stream_sessions 
ADD COLUMN admin_notes TEXT;

-- Add comment to document the column
COMMENT ON COLUMN stream_sessions.admin_notes IS 'Administrative notes about the stream session';