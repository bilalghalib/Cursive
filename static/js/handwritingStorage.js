/**
 * Handwriting Storage Service
 * Stores handwriting samples and profile in Supabase (with localStorage fallback)
 */

import { supabaseClient } from './supabaseClient.js';
import { getCurrentUser, isAuthenticated } from './authService.js';

const LOCALSTORAGE_SAMPLES_KEY = 'handwritingSamples';
const LOCALSTORAGE_PROFILE_KEY = 'handwritingStyleProfile';

/**
 * Save handwriting samples to storage
 * Saves to Supabase if authenticated, otherwise localStorage
 */
export async function saveHandwritingSamples(samples) {
  const user = await getCurrentUser();

  if (user && isAuthenticated()) {
    // Save to Supabase
    try {
      const { error } = await supabaseClient
        .from('user_handwriting')
        .upsert({
          user_id: user.id,
          samples: samples,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving handwriting to Supabase:', error);
        // Fallback to localStorage
        localStorage.setItem(LOCALSTORAGE_SAMPLES_KEY, JSON.stringify(samples));
      } else {
        console.log('✅ Handwriting samples saved to Supabase');
        // Also save to localStorage for offline access
        localStorage.setItem(LOCALSTORAGE_SAMPLES_KEY, JSON.stringify(samples));
      }
    } catch (e) {
      console.error('Supabase save error:', e);
      localStorage.setItem(LOCALSTORAGE_SAMPLES_KEY, JSON.stringify(samples));
    }
  } else {
    // Not authenticated, save to localStorage only
    localStorage.setItem(LOCALSTORAGE_SAMPLES_KEY, JSON.stringify(samples));
    console.log('ℹ Handwriting saved to localStorage (login to sync across devices)');
  }
}

/**
 * Save handwriting style profile
 */
export async function saveHandwritingProfile(profile) {
  const user = await getCurrentUser();

  if (user && isAuthenticated()) {
    // Save to Supabase
    try {
      const { error } = await supabaseClient
        .from('user_handwriting')
        .upsert({
          user_id: user.id,
          style_profile: profile,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving profile to Supabase:', error);
        localStorage.setItem(LOCALSTORAGE_PROFILE_KEY, JSON.stringify(profile));
      } else {
        console.log('✅ Handwriting profile saved to Supabase');
        localStorage.setItem(LOCALSTORAGE_PROFILE_KEY, JSON.stringify(profile));
      }
    } catch (e) {
      console.error('Supabase save error:', e);
      localStorage.setItem(LOCALSTORAGE_PROFILE_KEY, JSON.stringify(profile));
    }
  } else {
    localStorage.setItem(LOCALSTORAGE_PROFILE_KEY, JSON.stringify(profile));
    console.log('ℹ Handwriting profile saved to localStorage');
  }
}

/**
 * Load handwriting samples
 * Tries Supabase first, falls back to localStorage
 */
export async function loadHandwritingSamples() {
  const user = await getCurrentUser();

  if (user && isAuthenticated()) {
    // Try Supabase first
    try {
      const { data, error } = await supabaseClient
        .from('user_handwriting')
        .select('samples')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('No handwriting in Supabase, checking localStorage:', error.message);
        // Fallback to localStorage
        return loadFromLocalStorage('samples');
      }

      if (data && data.samples) {
        console.log('✅ Loaded handwriting from Supabase');
        // Cache in localStorage
        localStorage.setItem(LOCALSTORAGE_SAMPLES_KEY, JSON.stringify(data.samples));
        return data.samples;
      }
    } catch (e) {
      console.error('Error loading from Supabase:', e);
    }
  }

  // Fallback to localStorage
  return loadFromLocalStorage('samples');
}

/**
 * Load handwriting profile
 */
export async function loadHandwritingProfile() {
  const user = await getCurrentUser();

  if (user && isAuthenticated()) {
    // Try Supabase first
    try {
      const { data, error } = await supabaseClient
        .from('user_handwriting')
        .select('style_profile')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('No profile in Supabase, checking localStorage:', error.message);
        return loadFromLocalStorage('profile');
      }

      if (data && data.style_profile) {
        console.log('✅ Loaded handwriting profile from Supabase');
        localStorage.setItem(LOCALSTORAGE_PROFILE_KEY, JSON.stringify(data.style_profile));
        return data.style_profile;
      }
    } catch (e) {
      console.error('Error loading profile from Supabase:', e);
    }
  }

  return loadFromLocalStorage('profile');
}

/**
 * Load from localStorage helper
 */
function loadFromLocalStorage(type) {
  const key = type === 'samples' ? LOCALSTORAGE_SAMPLES_KEY : LOCALSTORAGE_PROFILE_KEY;
  const stored = localStorage.getItem(key);

  if (stored) {
    try {
      const data = JSON.parse(stored);
      console.log(`✅ Loaded handwriting ${type} from localStorage`);
      return data;
    } catch (e) {
      console.error(`Error parsing ${type} from localStorage:`, e);
      return null;
    }
  }

  return null;
}

/**
 * Check if user has handwriting samples
 */
export async function hasHandwritingSamples() {
  const samples = await loadHandwritingSamples();
  const profile = await loadHandwritingProfile();

  return !!(samples && profile && Object.keys(samples).length > 0);
}

/**
 * Delete handwriting data (for retraining)
 */
export async function deleteHandwritingData() {
  const user = await getCurrentUser();

  if (user && isAuthenticated()) {
    try {
      const { error } = await supabaseClient
        .from('user_handwriting')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting from Supabase:', error);
      } else {
        console.log('✅ Deleted handwriting from Supabase');
      }
    } catch (e) {
      console.error('Error deleting:', e);
    }
  }

  // Also clear localStorage
  localStorage.removeItem(LOCALSTORAGE_SAMPLES_KEY);
  localStorage.removeItem(LOCALSTORAGE_PROFILE_KEY);
  console.log('✅ Deleted handwriting from localStorage');
}

/**
 * Get storage info for debugging
 */
export async function getHandwritingStorageInfo() {
  const user = await getCurrentUser();
  const localSamples = localStorage.getItem(LOCALSTORAGE_SAMPLES_KEY);
  const localProfile = localStorage.getItem(LOCALSTORAGE_PROFILE_KEY);

  const info = {
    authenticated: user && isAuthenticated(),
    userId: user?.id || null,
    hasLocalSamples: !!localSamples,
    hasLocalProfile: !!localProfile,
    localSamplesSize: localSamples ? localSamples.length : 0,
    hasSupabaseSamples: false,
    hasSupabaseProfile: false
  };

  if (user && isAuthenticated()) {
    try {
      const { data, error } = await supabaseClient
        .from('user_handwriting')
        .select('samples, style_profile')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        info.hasSupabaseSamples = !!data.samples;
        info.hasSupabaseProfile = !!data.style_profile;
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return info;
}
