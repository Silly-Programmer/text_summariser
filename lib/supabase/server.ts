import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Untyped client: row types are declared next to each query in lib/db/*.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: SupabaseClient<any, "public", any> | null = null;

/** New projects call it SUPABASE_SECRET_KEY (sb_secret_...); older projects use the service_role key. Either works. */
const secretKey = () => process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && secretKey());
}

/**
 * Service-role client: bypasses RLS, so it must ONLY be used on the server,
 * and every query MUST filter by the Clerk user_id.
 */
export function supabaseAdmin() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
  }
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, secretKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
