import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { AppError, errorResponse, UUID_RE } from "@/lib/errors";
import { getQuiz, isQuizStale, patchQuiz, removeQuiz } from "@/lib/db/quizzes";
import { patchBody } from "@/lib/quiz/schema";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx) {
  const userId = await requireUserId();
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) throw new AppError("Quiz not found.", 404);
  return { userId, id };
}

// Polled by the quiz page while it is being written. Never returns the questions or answers.
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { userId, id } = await load(ctx);
    const q = await getQuiz(userId, id);
    if (!q) throw new AppError("Quiz not found.", 404);
    return NextResponse.json(
      { id: q.id, title: q.title, status: q.status, progress: q.progress, error: q.error, stale: isQuizStale(q) },
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
    if (!(await patchQuiz(userId, id, body.data))) throw new AppError("Quiz not found.", 404);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { userId, id } = await load(ctx);
    if (!(await removeQuiz(userId, id))) throw new AppError("Quiz not found.", 404);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
