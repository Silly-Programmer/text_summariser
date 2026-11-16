import { after, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getAI } from "@/lib/ai";
import { AppError, errorResponse, UUID_RE } from "@/lib/errors";
import { getDocument } from "@/lib/db/documents";
import { assertCanStartAiJob } from "@/lib/db/jobs";
import { createQuiz, findActiveQuiz } from "@/lib/db/quizzes";
import { QUIZ_LIMITS } from "@/lib/config";
import { getQuizCapacity } from "@/lib/quiz/capacity";
import { createQuizBody } from "@/lib/quiz/schema";
import { generateQuiz } from "@/lib/quiz/generate";

export const runtime = "nodejs";
export const maxDuration = 300; // background work after the response may run this long (Hobby plan maximum)

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) throw new AppError("Document not found.", 404);

    const body = createQuizBody.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new AppError("Choose the number of questions and a difficulty.");
    const { count, difficulty } = body.data;

    const doc = await getDocument(userId, id);
    if (!doc) throw new AppError("Document not found.", 404);
    if (doc.status !== "ready") throw new AppError("This document is still being processed.", 409);

    const capacity = await getQuizCapacity(userId, doc);
    if (capacity < QUIZ_LIMITS.minQuestions) throw new AppError("This document is too short to make a quiz. Try a longer PDF.");
    if (count > capacity) throw new AppError(`This document has enough material for up to ${capacity} questions. Choose ${capacity} or fewer.`);

    getAI(); // throws a clear error if the AI key/model are not configured

    const existing = await findActiveQuiz(userId, id, difficulty, count);
    if (existing) return NextResponse.json({ id: existing.id });

    await assertCanStartAiJob(userId);

    const title = `${doc.name.replace(/\.pdf$/i, "")} — ${difficulty} quiz`;
    const quiz = await createQuiz(userId, id, title, difficulty, count);
    after(() => generateQuiz(userId, quiz.id));
    return NextResponse.json({ id: quiz.id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
