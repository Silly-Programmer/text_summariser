import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

/**
 * File storage behind a tiny interface. To move to S3 later, only this file changes.
 * Files live at <clerk user id>/<document id>.pdf in the private "pdfs" bucket.
 */
const BUCKET = "pdfs";

export const storage = {
  async put(path: string, data: Buffer, contentType = "application/pdf") {
    const { error } = await supabaseAdmin().storage.from(BUCKET).upload(path, data, { contentType, upsert: true });
    if (error) throw new AppError(`Could not save the file: ${error.message}. Did you run supabase/schema.sql (it creates the "pdfs" bucket)?`, 500);
  },
  /** One-time URL the browser uploads to directly, so big PDFs never pass through the (4.5 MB limited) Vercel function. */
  async createUploadUrl(path: string): Promise<string> {
    const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (error || !data) throw new AppError(`Could not prepare the upload: ${error?.message ?? "unknown error"}. Did you run supabase/schema.sql (it creates the "pdfs" bucket)?`, 500);
    return data.signedUrl;
  },
  /** Size in bytes of a stored file, or null if it is not there. */
  async size(path: string): Promise<number | null> {
    const { data, error } = await supabaseAdmin().storage.from(BUCKET).info(path);
    if (error || !data) return null;
    const n = Number((data as { size?: number }).size);
    return Number.isFinite(n) ? n : 0;
  },
  async get(path: string): Promise<Buffer> {
    const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(path);
    if (error || !data) throw new AppError("Could not read the stored file.", 500);
    return Buffer.from(await data.arrayBuffer());
  },
  async remove(path: string) {
    await supabaseAdmin().storage.from(BUCKET).remove([path]);
  },
};
