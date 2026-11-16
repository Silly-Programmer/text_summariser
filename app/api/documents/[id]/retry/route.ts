import { after, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { AppError, errorResponse, UUID_RE } from "@/lib/errors";
import { getDocument, isStale, updateDocument } from "@/lib/db/documents";
import { processDocument } from "@/lib/pdf/process";

export const runtime = "nodejs";
export const maxDuration = 300; // background work after the response may run this long (Hobby plan maximum)

// Re-runs processing for a document that failed or got stuck.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) throw new AppError("Document not found.", 404);
    const d = await getDocument(userId, id);
    if (!d) throw new AppError("Document not found.", 404);
    if (!(d.status === "failed" || isStale(d))) throw new AppError("This document is already being processed.", 409);

    await updateDocument(userId, id, { status: "extracting", progress: 0, status_detail: "Restarting", error: null });
    after(() => processDocument(userId, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
