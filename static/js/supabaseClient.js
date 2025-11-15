/**
 * Supabase Client Initialization
 *
 * This file initializes the Supabase client for use throughout the app.
 * It should be imported before any other modules that need Supabase access.
 */

// Import Supabase from npm package
import { createClient } from '@supabase/supabase-js';

// Get config from environment variables (Vite injects these at build time)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

// Create and export Supabase client
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

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

console.log('✅ Supabase client initialized');
