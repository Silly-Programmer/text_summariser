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
  async get(path: string): Promise<Buffer> {
    const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(path);
    if (error || !data) throw new AppError("Could not read the stored file.", 500);
    return Buffer.from(await data.arrayBuffer());
  },
  async remove(path: string) {
    await supabaseAdmin().storage.from(BUCKET).remove([path]);
  },
};
