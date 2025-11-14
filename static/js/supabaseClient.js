/**
 * Supabase Client Initialization
 *
 * This file initializes the Supabase client for use throughout the app.
 * It should be imported before any other modules that need Supabase access.
 */

import { createClient } from '@supabase/supabase-js'

// Supabase configuration from environment variables
// For development: These come from .env via Vite (VITE_ prefix)
// For production: Set in Vercel/Netlify environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

if (!SUPABASE_URL || SUPABASE_URL === 'http://localhost:54321') {
  console.warn('⚠️  Using local Supabase. Set VITE_SUPABASE_URL for production.')
}

// Create and export Supabase client
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Backwards compatibility export
export const supabase = supabaseClient

// Helper to get current session
export async function getSupabaseSession() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return session;
}

// Helper to get current user
export async function getSupabaseUser() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
}

// Helper: Check if user is authenticated
export async function isAuthenticated() {
  const user = await getSupabaseUser()
  return user !== null
}

// Helper: Listen for auth state changes
export function onAuthStateChange(callback) {
  return supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log(`🔐 Auth event: ${event}`, session?.user?.email || 'no user')
    callback(event, session)
  })
}

console.log('✅ Supabase client initialized:', SUPABASE_URL)
