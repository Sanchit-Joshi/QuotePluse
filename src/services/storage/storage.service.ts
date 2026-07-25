import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase";

const BUCKET = process.env.SUPABASE_UPLOADS_BUCKET || "uploads";

/**
 * Uploads a file to the Supabase Storage "uploads" bucket under a
 * generated filename (never the client-supplied name, to prevent path
 * traversal — security.md §File uploads) and returns its public URL.
 *
 * Chosen over local disk (the original MVP implementation) because
 * serverless deployments (Vercel) have an ephemeral, read-only filesystem
 * — anything written to disk disappears on the next cold start or is
 * invisible to other instances. See docs/decision-log.md ADR-010.
 *
 * The bucket must be configured for public read access so the PDF
 * renderer (Playwright) and browser can load the returned URL directly
 * without a signed-URL round trip.
 */
export async function uploadPublicFile(
  buffer: Buffer,
  extension: string,
  contentType: string,
): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const filename = `${randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}
