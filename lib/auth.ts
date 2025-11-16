import { supabase, isSupabaseConfigured } from './supabase';

export async function signUp(email: string, password: string) {
  if (!isSupabaseConfigured) {
    return { data: null, error: { message: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.' } };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  if (!isSupabaseConfigured) {
    return { data: null, error: { message: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.' } };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  if (!isSupabaseConfigured) {
    return { error: null };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured) {
    return { user: null, error: null };
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export async function isAuthenticated() {
  const { user } = await getCurrentUser();
  return !!user;
}
