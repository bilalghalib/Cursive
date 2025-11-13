/**
 * Authentication Service
 *
 * Handles user authentication with Flask backend:
 * - Register
 * - Login
 * - Logout
 * - Token management
 * - API key management (BYOK)
 */

const AUTH_TOKEN_KEY = 'cursive_auth_token';
const USER_DATA_KEY = 'cursive_user_data';

/**
 * Register a new user
 *
 * @param {string} email - User's email address
 * @param {string} password - User's password (min 8 characters)
 * @returns {Promise<Object>} { success: boolean, user?: object, error?: string }
 */
export async function register(email, password) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store token and user data
      if (data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      }
      if (data.user) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
      }
      console.log('✅ Registration successful:', data.user?.email);
      return { success: true, user: data.user };
    } else {
      console.error('Registration error:', data.error);
      return { success: false, error: data.error || 'Registration failed' };
    }
  } catch (error) {
    console.error('Registration failed:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Login user
 *
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} { success: boolean, user?: object, error?: string }
 */
export async function login(email, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store token and user data
      if (data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      }
      if (data.user) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
      }
      console.log('✅ Login successful:', data.user?.email);
      return { success: true, user: data.user };
    } else {
      console.error('Login error:', data.error);
      return { success: false, error: data.error || 'Login failed' };
    }
  } catch (error) {
    console.error('Login failed:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Logout user
 *
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    const token = getAuthToken();
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    console.log('✅ Logout successful');
    // Reload page to reset app state
    window.location.reload();
  }
}

/**
 * Get current auth token
 *
 * @returns {string|null}
 */
export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Get current user data
 *
 * @returns {Object|null}
 */
export function getCurrentUser() {
  const userData = localStorage.getItem(USER_DATA_KEY);
  return userData ? JSON.parse(userData) : null;
}

/**
 * Check if user is authenticated
 *
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Make authenticated API request
 *
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function authenticatedFetch(url, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If unauthorized, clear auth and redirect to login
  if (response.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    window.location.reload();
    throw new Error('Session expired. Please login again.');
  }

  return response;
}

/**
 * Save user's API key (BYOK)
 *
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
export async function saveApiKey(apiKey) {
  try {
    const response = await authenticatedFetch('/api/auth/api-key', {
      method: 'POST',
      body: { api_key: apiKey },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ API key saved successfully');
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Failed to save API key' };
    }
  } catch (error) {
    console.error('API key save error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's usage stats
 *
 * @returns {Promise<Object>} { tokens_used: number, cost: number, limit: number }
 */
export async function getUsageStats() {
  try {
    const response = await authenticatedFetch('/api/billing/usage');

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error('Failed to fetch usage stats');
      return { tokens_used: 0, cost: 0, limit: 10000 };
    }
  } catch (error) {
    console.error('Usage stats error:', error);
    return { tokens_used: 0, cost: 0, limit: 10000 };
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
 * @returns {Object} { valid: boolean, message?: string }
 */
export function validatePassword(password) {
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number'
    };
  }

  return {
    valid: true,
    message: 'Password is strong'
  };
}
