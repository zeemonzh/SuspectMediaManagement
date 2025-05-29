# Consolidated Database Migration

This directory contains both the **legacy migration files** (for existing installations) and the **new consolidated setup** for fresh installations.

## 🎯 For Fresh Database Setup (Recommended)

If you're setting up a completely new database, use this single migration:

### `00_consolidated_initial_setup.sql`
This file contains everything you need:
- ✅ Complete database schema
- ✅ All tables with proper relationships
- ✅ Row Level Security (RLS) policies
- ✅ Performance indexes
- ✅ System configuration
- ✅ Helper functions and triggers
- ✅ Initial data (product categories)

**How to Apply:**
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the entire contents of `00_consolidated_initial_setup.sql`
4. Execute it once

## 🔧 Customizing Configuration

The migration includes configurable settings instead of hardcoded values:

### Platform Configuration
Located in the `system_defaults` table with key `platform_config`:

```json
{
  "platform_name": "SuspectCheats",        // Change this to your platform name
  "superadmin_key": "SUSPECT-SUPERADMIN",  // Change this to your preferred admin key
  "currency": "USD",                       // Change currency (USD, EUR, etc.)
  "timezone": "UTC"                        // Set your timezone
}
```

### Default Goals Configuration
Located in the `system_defaults` table with key `default_goals`:

```json
{
  "minimum_duration_minutes": 60,  // Minimum stream duration for payout
  "target_viewers": 1000,          // Target viewer count for full payout
  "base_payout": 7.20,             // Full payout amount
  "partial_payout": 4.50           // Partial payout (time goal only)
}
```

### Product Categories
The migration creates these default categories:
- Fortnite Cheats
- Valorant Cheats
- APEX Legends Cheats
- Call of Duty Cheats

**To customize:** Edit the INSERT statements at the bottom of the migration file before running it.

### Superadmin Key
The superadmin invitation key is **automatically generated** from your platform configuration. 

**To use a custom key:**
1. Before running the migration, edit the `platform_config` section
2. Change `"superadmin_key": "YOUR-CUSTOM-KEY"`
3. This key will be created automatically during setup

## 📊 What Gets Created

### Tables:
- `streamers` - User accounts and profiles
- `stream_sessions` - Stream tracking and payouts
- `product_categories` - Product organization
- `product_keys` - License key management
- `key_requests` - Key request workflow
- `streamer_goals` - Custom streamer goals
- `payout_requests` - Payout management
- `admin_invitations` - Admin account creation
- `system_defaults` - Configuration storage

### Functions:
- `get_system_default_goals()` - Retrieves default payout settings
- `calculate_stream_payout()` - Calculates stream payouts
- `update_stream_session_payout()` - Auto-calculates payouts

### Security:
- Complete Row Level Security (RLS) policies
- Proper role-based access control
- Secure foreign key relationships

## 🔄 For Existing Installations (Legacy)

If you already have a database with some of the old migrations applied, you can still use the individual migration files in order:

1. `00_initial_schema.sql` (if not already applied)
2. `01_auth_setup.sql`
3. `02_fix_user_deletion.sql`
4. Continue with numbered files in sequence...

**Note:** The consolidated migration replaces all of these individual files.

## 🚀 Post-Setup

After running the migration:

1. **Test the superadmin key:** Use your configured admin key to create the first admin account
2. **Verify configuration:** Check that your custom settings are properly stored
3. **Add product keys:** Upload your license keys through the admin interface
4. **Customize goals:** Adjust default payout settings as needed

**Important:** This setup requires the `/api/auth/register` endpoint to handle user registration properly. The API endpoint uses service role permissions to bypass Row Level Security during account creation.

## 🔍 Troubleshooting

**Issue:** "Function already exists" errors
**Solution:** The migration uses `CREATE OR REPLACE` - this is normal and safe

**Issue:** "Policy already exists" errors  
**Solution:** Drop existing policies first, or ignore these errors if they're for the same policies

**Issue:** Custom configuration not taking effect
**Solution:** Verify your JSON formatting in the `system_defaults` inserts

## 📝 Environment Variables

The following should be set in your application:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonymous key for public operations

## 🎉 Benefits of Consolidated Approach

✅ **Single file setup** - No dependency tracking  
✅ **Consistent schema** - All tables created with proper relationships  
✅ **Built-in configuration** - Customizable without code changes  
✅ **Complete security** - All RLS policies included  
✅ **Performance optimized** - All indexes included  
✅ **Future-proof** - Easy to extend and modify 