/**
 * Supabase Client Initialization
 *
 * This file initializes the Supabase client for use throughout the app.
 * It should be imported before any other modules that need Supabase access.
 */

// Get Supabase from the CDN (loaded in index.html)
const { createClient } = supabase;

// Import Supabase config
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig.js';

// Create and export Supabase client
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
