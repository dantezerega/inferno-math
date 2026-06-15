import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
// Supports both the legacy anon key and the newer publishable key
// (`sb_publishable_...`). Either works as the client key.
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Whether Supabase credentials are present. When false, the app runs in
 * local-only mode (no auth, localStorage-only stats) and every cloud call
 * becomes a safe no-op. This lets the app build and run with zero config.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The Supabase client, or null when not configured. Always guard usage with
 * `isSupabaseConfigured` or the `requireSupabase()` helper.
 *
 * The client is intentionally untyped (no generated `Database` generic) so the
 * app has no build-time dependency on a live project; we apply our hand-written
 * row types from `@/types/db` at the call boundaries instead.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Returns the client or throws — use only after checking configuration. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured (missing env vars).');
  }
  return supabase;
}
