import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { AppError, errorResponse, UUID_RE } from "@/lib/errors";
import { getSummary, isSummaryStale, patchSummary, removeSummary } from "@/lib/db/summaries";
import { patchBody } from "@/lib/quiz/schema";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx) {
  const userId = await requireUserId();
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) throw new AppError("Summary not found.", 404);
  return { userId, id };
}

// Polled by the summary page while it is being written.
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { userId, id } = await load(ctx);
    const s = await getSummary(userId, id);
    if (!s) throw new AppError("Summary not found.", 404);
    return NextResponse.json(
      { id: s.id, title: s.title, status: s.status, progress: s.progress, error: s.error, content: s.content, stale: isSummaryStale(s) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return errorResponse(e);
  }
}

// Rename and/or save / unsave.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { userId, id } = await load(ctx);
    const body = patchBody.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new AppError(body.error.issues[0]?.message ?? "Invalid request.");
    if (!(await patchSummary(userId, id, body.data))) throw new AppError("Summary not found.", 404);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { userId, id } = await load(ctx);
    if (!(await removeSummary(userId, id))) throw new AppError("Summary not found.", 404);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}