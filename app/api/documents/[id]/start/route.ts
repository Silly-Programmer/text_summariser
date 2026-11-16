import { after, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { LIMITS } from "@/lib/config";
import { AppError, errorResponse, UUID_RE } from "@/lib/errors";
import { getDocument, removeDocument, updateDocument } from "@/lib/db/documents";
import { storage } from "@/lib/storage";
import { processDocument } from "@/lib/pdf/process";

export const runtime = "nodejs";
// Background processing keeps running after the response, up to this many seconds.
// 300 is the maximum on Vercel's free (Hobby) plan. Pro plans may raise it (up to 800).
export const maxDuration = 300;

/** Step 2 of an upload: the browser finished uploading, so check the file arrived and start processing. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) throw new AppError("Document not found.", 404);
    const doc = await getDocument(userId, id);
    if (!doc) throw new AppError("Document not found.", 404);
    if (doc.status !== "uploaded") return NextResponse.json({ id }); // already started: nothing to do

    const size = await storage.size(doc.storage_path);
    if (size === null) throw new AppError("The upload did not finish. Please try again.", 409);
    if (size === 0 || size > LIMITS.maxPdfBytes) {
      await storage.remove(doc.storage_path).catch(() => {});
      await removeDocument(userId, id).catch(() => {});
      throw new AppError("This file is empty or too large.", 413);
    }

    await updateDocument(userId, id, { status: "extracting", progress: 1, status_detail: "Opening your PDF", size_bytes: size });
    after(() => processDocument(userId, id));
    return NextResponse.json({ id }, { status: 202 });
  } catch (e) {
    return errorResponse(e);
  }
}
