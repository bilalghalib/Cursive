/**
 * Authentication Service (Supabase)
 *
 * Handles user authentication using Supabase Auth
 */

import { supabaseClient } from './supabaseClient.js';

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  // This is a synchronous check - for full verification use getSession()
  const session = localStorage.getItem('sb-session');
  return !!session;
}

/**
 * Get current session
 * @returns {Promise<Object|null>}
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    // Cache session info for synchronous checks
    if (session) {
      localStorage.setItem('sb-session', 'true');
    } else {
      localStorage.removeItem('sb-session');
    }

    return session;
  } catch (error) {
    console.error('Error in getSession:', error);
    return null;
  }
}

/**
 * Get current user
 * @returns {Promise<Object|null>}
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error) {
      console.error('Error getting user:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Login with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, error?: string, user?: Object}>}
 */
export async function login(email, password) {
  try {
    if (!isValidEmail(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    if (!validatePassword(password)) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }

    // Cache session
    localStorage.setItem('sb-session', 'true');

    console.log('✅ Login successful:', data.user.email);
    return { success: true, user: data.user };
  } catch (error) {
    console.error('Login exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign up with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, error?: string, user?: Object}>}
 */
export async function signUp(email, password) {
  try {
    if (!isValidEmail(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    if (!validatePassword(password)) {
      return {
        success: false,
        error: 'Password must be at least 8 characters with uppercase, lowercase, and a number',
      };
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Signup error:', error);
      return { success: false, error: error.message };
    }

    // Create user settings record
    if (data.user) {
      const { error: settingsError } = await supabaseClient
        .from('user_settings')
        .insert({
          user_id: data.user.id,
          subscription_tier: 'free',
          tokens_used_this_period: 0,
        });

      if (settingsError) {
        console.error('Error creating user settings:', settingsError);
      }
    }

    // Cache session
    localStorage.setItem('sb-session', 'true');

    console.log('✅ Signup successful:', data.user.email);
    return { success: true, user: data.user };
  } catch (error) {
    console.error('Signup exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Logout current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function logout() {
  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }

    // Clear session cache
    localStorage.removeItem('sb-session');

    console.log('✅ Logout successful');

    // Reload page to reset app state
    window.location.reload();

    return { success: true };
  } catch (error) {
    console.error('Logout exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate password strength
 * @param {string} password
 * @returns {boolean}
 */
export function validatePassword(password) {
  if (!password || password.length < 8) {
    return false;
  }

  // Check for at least one uppercase, one lowercase, and one number
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasUppercase && hasLowercase && hasNumber;
}

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get password strength indicator
 * @param {string} password
 * @returns {{strength: string, color: string, message: string}}
 */
export function getPasswordStrength(password) {
  if (!password) {
    return { strength: '', color: '', message: '' };
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) {
    return { strength: 'weak', color: '#e74c3c', message: 'Weak password' };
  } else if (score <= 4) {
    return { strength: 'medium', color: '#f39c12', message: 'Medium strength' };
  } else {
    return { strength: 'strong', color: '#27ae60', message: 'Strong password' };
  }
}

console.log('✅ Auth Service (Supabase) initialized');
