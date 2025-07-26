import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Keep session persistence but handle logout properly
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // More secure auth flow
  }
}) 