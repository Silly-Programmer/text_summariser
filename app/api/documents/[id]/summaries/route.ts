import { after, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getAI } from "@/lib/ai";
import { AppError, errorResponse, UUID_RE } from "@/lib/errors";
import { getDocument } from "@/lib/db/documents";
import { createSummary, findActiveSummary } from "@/lib/db/summaries";
import { assertCanStartAiJob } from "@/lib/db/jobs";
import { SUMMARY_TYPES, TYPE_LABEL, type SummaryType } from "@/lib/summarize/prompts";
import { generateSummary } from "@/lib/summarize/generate";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) throw new AppError("Document not found.", 404);

    const body = (await req.json().catch(() => null)) as { type?: string } | null;
    const type = body?.type as SummaryType;
    if (!SUMMARY_TYPES.includes(type)) throw new AppError("Choose a summary type.");

    const doc = await getDocument(userId, id);
    if (!doc) throw new AppError("Document not found.", 404);
    if (doc.status !== "ready") throw new AppError("This document is still being processed.", 409);

    getAI(); // throws a clear error if the AI key/model are not configured

    const existing = await findActiveSummary(userId, id, type);
    if (existing) return NextResponse.json({ id: existing.id });

    await assertCanStartAiJob(userId);

    const title = `${doc.name.replace(/\.pdf$/i, "")} — ${TYPE_LABEL[type]}`;
    const s = await createSummary(userId, id, type, title);
    after(() => generateSummary(userId, s.id));
    return NextResponse.json({ id: s.id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
