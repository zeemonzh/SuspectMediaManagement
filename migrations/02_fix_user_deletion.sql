-- Fix user deletion issue by updating foreign key constraint
-- Drop the existing foreign key constraint and recreate it with CASCADE

-- First, drop the existing constraint
ALTER TABLE streamers DROP CONSTRAINT IF EXISTS streamers_user_id_fkey;

-- Recreate the constraint with CASCADE DELETE
ALTER TABLE streamers 
ADD CONSTRAINT streamers_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- This means when a user is deleted from auth.users,
-- their corresponding record in streamers will also be automatically deleted 