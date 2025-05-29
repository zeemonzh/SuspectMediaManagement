// Secure Supabase server client utility
// Uses environment variables but avoids Next.js caching issues
const { createClient } = require('@supabase/supabase-js')

// Create a function that returns a fresh Supabase client
function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, serviceKey)
}

module.exports = { createSupabaseServerClient } 