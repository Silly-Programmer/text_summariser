import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { AppError, errorResponse, UUID_RE } from "@/lib/errors";
import { getDocument, isStale, removeDocument } from "@/lib/db/documents";
import { storage } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx) {
  const userId = await requireUserId();
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) throw new AppError("Document not found.", 404);
  return { userId, id };
}

// Polled by the progress bar.
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { userId, id } = await load(ctx);
    const d = await getDocument(userId, id);
    if (!d) throw new AppError("Document not found.", 404);
    return NextResponse.json(
      { id: d.id, status: d.status, progress: d.progress, status_detail: d.status_detail, page_count: d.page_count, error: d.error, stale: isStale(d) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { userId, id } = await load(ctx);
    const removed = await removeDocument(userId, id); // summaries, quizzes and chunks go with it (ON DELETE CASCADE)
    if (!removed) throw new AppError("Document not found.", 404);
    await storage.remove(removed.storage_path).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
