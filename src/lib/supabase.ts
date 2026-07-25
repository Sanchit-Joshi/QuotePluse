import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

/**
 * Server-only Supabase client using the secret key — bypasses RLS, must
 * never be imported into client components or exposed via NEXT_PUBLIC_*.
 * Used exclusively by the storage service (see ADR-010).
 */
export function getSupabaseAdminClient() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set to use file storage");
  }

  client = createClient(url, secretKey, {
    auth: { persistSession: false },
  });
  return client;
}
