import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { AppError, errorResponse, UUID_RE } from "@/lib/errors";
import { createAttempt, getQuiz } from "@/lib/db/quizzes";
import { attemptBody } from "@/lib/quiz/schema";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Submit a finished quiz. The score is worked out HERE, on the server, from the stored answers,
 * so the browser never needs (or sees) the correct answers before the quiz is submitted.
 */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) throw new AppError("Quiz not found.", 404);

    const body = attemptBody.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new AppError("Your answers could not be read. Please try again.");

    const quiz = await getQuiz(userId, id);
    if (!quiz) throw new AppError("Quiz not found.", 404);
    if (quiz.status !== "done" || !quiz.questions.length) throw new AppError("This quiz is not ready yet.", 409);

    const { answers } = body.data;
    if (answers.length !== quiz.questions.length) throw new AppError("Your answers do not match this quiz. Please reload the page and try again.");

    const score = quiz.questions.reduce((n, q, i) => n + (answers[i] === q.correctAnswer ? 1 : 0), 0);
    const attempt = await createAttempt(userId, id, answers, score, quiz.questions.length);
    return NextResponse.json({ id: attempt.id, score, total: attempt.total }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
