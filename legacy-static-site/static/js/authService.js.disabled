/**
 * Authentication Service
 *
 * Handles user authentication with Supabase:
 * - Sign up
 * - Log in
 * - Log out
 * - Password reset
 * - Auth state changes
 */

import getSupabase from './supabaseClient.js';

/**
 * Sign up a new user
 *
 * @param {string} email - User's email address
 * @param {string} password - User's password (min 8 characters)
 * @returns {Promise<Object>} User data and session
 * @throws {Error} If signup fails
 */
export async function signUp(email, password) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        // Email confirmation settings
        emailRedirectTo: window.location.origin,
      }
    });

    if (error) {
      console.error('Sign up error:', error);
      throw new Error(error.message);
    }

    console.log('✅ Sign up successful:', data.user?.email);
    return data;

  } catch (error) {
    console.error('Sign up failed:', error);
    throw error;
  }
}

/**
 * Log in with email and password
 *
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} User data and session
 * @throws {Error} If login fails
 */
export async function login(email, password) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) {
      console.error('Login error:', error);
      throw new Error(error.message);
    }

    console.log('✅ Login successful:', data.user?.email);
    return data;

  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

/**
 * Log out the current user
 *
 * @returns {Promise<void>}
 * @throws {Error} If logout fails
 */
export async function logout() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      throw new Error(error.message);
    }

    console.log('✅ Logout successful');

  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}

/**
 * Send password reset email
 *
 * @param {string} email - User's email address
 * @returns {Promise<void>}
 * @throws {Error} If request fails
 */
export async function resetPassword(email) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      throw new Error(error.message);
    }

    console.log('✅ Password reset email sent');

  } catch (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
}

/**
 * Update user password (when logged in)
 *
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 * @throws {Error} If update fails
 */
export async function updatePassword(newPassword) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Password update error:', error);
      throw new Error(error.message);
    }

    console.log('✅ Password updated successfully');

  } catch (error) {
    console.error('Password update failed:', error);
    throw error;
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
 * Get current user
 *
 * @returns {Promise<Object|null>} User object or null
 */
export async function getCurrentUser() {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting user:', error);
      return null;
    }

    return user;

  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Listen for authentication state changes
 *
 * @param {Function} callback - Callback function (event, session) => {}
 * @returns {Object} Subscription object with unsubscribe method
 *
 * @example
 * const subscription = onAuthStateChange((event, session) => {
 *   if (event === 'SIGNED_IN') {
 *     console.log('User signed in:', session.user);
 *   } else if (event === 'SIGNED_OUT') {
 *     console.log('User signed out');
 *   }
 * });
 *
 * // Later, to unsubscribe:
 * subscription.unsubscribe();
 */
export function onAuthStateChange(callback) {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client not initialized');
    return { unsubscribe: () => {} };
  }

  try {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email);
        callback(event, session);
      }
    );

    return subscription;

  } catch (error) {
    console.error('Error setting up auth state listener:', error);
    return { unsubscribe: () => {} };
  }
}

/**
 * Check if user is authenticated
 *
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export async function isAuthenticated() {
  const session = await getSession();
  return !!session;
}

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 *
 * @param {string} provider - OAuth provider name ('google', 'github', etc.)
 * @returns {Promise<void>}
 * @throws {Error} If OAuth sign in fails
 */
export async function signInWithOAuth(provider) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      }
    });

    if (error) {
      console.error('OAuth sign in error:', error);
      throw new Error(error.message);
    }

    // User will be redirected to OAuth provider
    console.log(`🔐 Redirecting to ${provider} for authentication...`);

  } catch (error) {
    console.error('OAuth sign in failed:', error);
    throw error;
  }
}

/**
 * Validate email format
 *
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 *
 * @param {string} password - Password to validate
 * @returns {Object} { isValid: boolean, message: string }
 */
export function validatePassword(password) {
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number'
    };
  }

  return {
    isValid: true,
    message: 'Password is strong'
  };
}
