-- Migration: Allow null tiktok_username for admin accounts
-- This removes the NOT NULL constraint so admin accounts can have null TikTok usernames

-- Remove the NOT NULL constraint from tiktok_username
ALTER TABLE streamers ALTER COLUMN tiktok_username DROP NOT NULL;

-- Update existing admin accounts to have null tiktok_username instead of 'N/A' or admin-generated values
UPDATE streamers 
SET tiktok_username = NULL 
WHERE role = 'admin' AND (tiktok_username = 'N/A' OR tiktok_username LIKE 'admin-%'); 