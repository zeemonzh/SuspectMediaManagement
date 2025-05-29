# Database Migrations

This folder contains SQL migration scripts for the SuspectCheats platform.

## Migration Files

### 00_initial_schema.sql
**Purpose:** Creates the base database schema
- Creates all main tables (streamers, stream_sessions, goals, payouts, product_keys, key_requests)
- Adds sample data for testing
- **Status:** Required for fresh setup (you may have already run this manually)

### 01_auth_setup.sql
**Purpose:** Initial authentication setup
- Adds `user_id` and `role` columns to the streamers table
- Creates foreign key relationship with Supabase auth.users
- Sets up basic authentication infrastructure
- **Status:** Applied and working

### 02_fix_user_deletion.sql  
**Purpose:** Enable user deletion in Supabase
- Updates foreign key constraint to use CASCADE DELETE
- Allows deletion of auth.users without foreign key constraint errors
- Automatically cleans up streamer records when users are deleted
- **Status:** Applied and working

### 03_admin_invitations.sql
**Purpose:** Admin invitation system
- Creates admin_invitations table for invitation keys
- Only users with valid invitation keys can create admin accounts
- Includes sample invitation keys (including PARADOX-ADMIN-KEY for superuser)
- **Status:** NEW - needs to be applied

## How to Apply Migrations

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of each migration file
4. Execute them in order (01, 02, etc.)

## Notes

- These migrations should only be run once
- Always backup your database before running migrations
- The authentication system is working properly with these migrations applied 