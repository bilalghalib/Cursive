/**
 * Supabase Client Configuration
 *
 * This module initializes the Supabase client for frontend use.
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://app.supabase.com/project/YOUR_PROJECT/settings/api
 * 2. Copy your Project URL and anon/public key
 * 3. Replace the values below
 * 4. See .env.local.example for database setup
 */

// ⚠️ CONFIGURE THESE VALUES ⚠️
// Get them from: Supabase Dashboard > Settings > API
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Public key (safe to expose in frontend)

// Import Supabase client from CDN
// Make sure to include this in index.html:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

let supabaseClient = null;

/**
 * Initialize Supabase client
 */
export function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase library not loaded. Make sure to include the CDN script in index.html');
    return null;
  }

  if (!supabaseClient) {
    // Check if credentials are configured
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
      console.error('⚠️ Supabase credentials not configured!');
      console.error('Please update SUPABASE_URL and SUPABASE_ANON_KEY in static/js/supabaseClient.js');
      console.error('Get these values from: Supabase Dashboard > Settings > API');

      // Show user-friendly error
      alert('Supabase is not configured. Please see console for details.');
      return null;
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized');
  }

  return supabaseClient;
}

/**
 * Get Supabase client instance
 */
export function getSupabase() {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
}

/**
 * Get current authenticated user
 *
 * @returns {Promise<Object|null>} User object or null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 *
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export async function isAuthenticated() {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error checking authentication:', error);
      return false;
    }

    return !!session;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Get current session
 *
 * @returns {Promise<Object|null>} Session object or null
 */
export async function getSession() {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Get access token for API calls
 *
 * @returns {Promise<string|null>} Access token or null
 */
export async function getAccessToken() {
  const session = await getSession();
  return session?.access_token || null;
}

// Export the main client getter as default
export default getSupabase;
