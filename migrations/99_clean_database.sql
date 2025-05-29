-- Database Cleanup Script
-- This script removes all existing tables, functions, triggers, and policies
-- Run this BEFORE running 00_consolidated_initial_setup.sql on an existing database

-- ====================================
-- 1. DROP ALL TRIGGERS
-- ====================================

DROP TRIGGER IF EXISTS trg_update_stream_session_payout ON stream_sessions;
DROP TRIGGER IF EXISTS trigger_update_stream_session_payout ON stream_sessions;

-- ====================================
-- 2. DROP ALL FUNCTIONS
-- ====================================

DROP FUNCTION IF EXISTS update_stream_session_payout() CASCADE;
DROP FUNCTION IF EXISTS calculate_stream_payout(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, DECIMAL, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS calculate_stream_payout(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, DECIMAL, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS get_system_default_goals() CASCADE;
DROP FUNCTION IF EXISTS use_invitation_key(TEXT, UUID) CASCADE;

-- ====================================
-- 3. DROP ALL TABLES (in dependency order)
-- ====================================

-- Drop tables with foreign key dependencies first
DROP TABLE IF EXISTS payout_requests CASCADE;
DROP TABLE IF EXISTS key_requests CASCADE;
DROP TABLE IF EXISTS product_keys CASCADE;
DROP TABLE IF EXISTS stream_sessions CASCADE;
DROP TABLE IF EXISTS streamer_goals CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS admin_invitations CASCADE;
DROP TABLE IF EXISTS invitation_keys CASCADE;
DROP TABLE IF EXISTS system_defaults CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS streamers CASCADE;

-- ====================================
-- 4. DROP ALL CUSTOM TYPES (if any)
-- ====================================

-- Drop any custom types that might exist
DROP TYPE IF EXISTS payout_status CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ====================================
-- 5. CLEAN UP ANY REMAINING SEQUENCES
-- ====================================

-- Note: Most sequences are auto-created with UUID columns and will be cleaned up automatically
-- But let's clean up any manual sequences if they exist
DO $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
        AND sequence_name NOT LIKE 'auth_%'  -- Don't touch auth sequences
    LOOP
        EXECUTE format('DROP SEQUENCE IF EXISTS %I CASCADE', seq_name);
    END LOOP;
END $$;

-- ====================================
-- 6. CLEAN UP ANY REMAINING VIEWS
-- ====================================

DO $$
DECLARE
    view_name text;
BEGIN
    FOR view_name IN 
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', view_name);
    END LOOP;
END $$;

-- ====================================
-- 7. VERIFICATION
-- ====================================

-- Show remaining public schema objects (should be minimal)
SELECT 
    'Remaining tables:' as object_type,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public'

UNION ALL

SELECT 
    'Remaining functions:' as object_type,
    COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public'

UNION ALL

SELECT 
    'Remaining sequences:' as object_type,
    COUNT(*) as count
FROM information_schema.sequences 
WHERE sequence_schema = 'public'

UNION ALL

SELECT 
    'Remaining views:' as object_type,
    COUNT(*) as count
FROM information_schema.views 
WHERE table_schema = 'public';

-- ====================================
-- 8. FINAL MESSAGE
-- ====================================

SELECT 'Database cleanup completed! You can now run 00_consolidated_initial_setup.sql' as status; 