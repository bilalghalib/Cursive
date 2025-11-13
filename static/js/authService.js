/**
 * Auth Service Stub (Legacy Mode)
 *
 * This is a stub that allows the frontend to work without authentication.
 * For production, implement proper authentication that calls the Flask backend API.
 */

/**
 * Check if user is authenticated
 * @returns {boolean} - Always returns true in legacy mode
 */
export function isAuthenticated() {
  // Legacy mode: no authentication required
  return true;
}

/**
 * Get current session
 * @returns {Promise<Object|null>} - Returns null in legacy mode
 */
export async function getSession() {
  return null;
}

/**
 * Get current user
 * @returns {Promise<Object|null>} - Returns mock user in legacy mode
 */
export async function getCurrentUser() {
  return {
    id: 'local-user',
    email: 'local@cursive.app',
    subscription_tier: 'free'
  };
}

/**
 * Login stub (not implemented)
 */
export async function login(email, password) {
  console.warn('Authentication not implemented in legacy mode');
  return { success: false, error: 'Not implemented' };
}

/**
 * Signup stub (not implemented)
 */
export async function signUp(email, password) {
  console.warn('Authentication not implemented in legacy mode');
  return { success: false, error: 'Not implemented' };
}

/**
 * Logout stub (not implemented)
 */
export async function logout() {
  console.warn('Logout not implemented in legacy mode');
  return { success: true };
}

/**
 * Validate password
 * @param {string} password
 * @returns {boolean}
 */
export function validatePassword(password) {
  return password && password.length >= 8;
}

/**
 * Validate email
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

console.log('✅ Auth Service (Legacy Mode) - Authentication disabled');
