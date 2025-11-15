/**
 * Supabase Configuration
 */

export const SUPABASE_URL = 'https://kfgmeonhhmchoyoklswm.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZ21lb25oaG1jaG95b2tsc3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTYxOTAsImV4cCI6MjA3ODYzMjE5MH0.qD9etDXm-GROUSFNaonZRYR5nbN88FnMey4S97Z547E'

// Edge Function endpoints
export const EDGE_FUNCTIONS = {
  claudeProxy: `${SUPABASE_URL}/functions/v1/claude-proxy`,
  stripeWebhook: `${SUPABASE_URL}/functions/v1/stripe-webhook`
}
