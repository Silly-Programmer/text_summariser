import "server-only";
import { getAI } from "@/lib/ai";
import { JOB_DEADLINE_MS } from "@/lib/config";
import { startDeadline } from "@/lib/async";
import { AIError } from "@/lib/ai/types";
import { AppError, userMessage } from "@/lib/errors";
import { listChunks } from "@/lib/db/documents";
import { getQuiz, updateQuiz } from "@/lib/db/quizzes";
import { buildQuiz } from "./build";

const TOO_SLOW = "This took longer than the hosting time limit allows. Try fewer questions, or use a shorter PDF.";

/** Background job: load chunks -> ask the AI per chunk -> validate with Zod -> save the questions on the quizzes row. */
export async function generateQuiz(userId: string, quizId: string) {
  let timedOut = false;
  // Fail with a clear message just before the host would silently kill this job.
  const cancelDeadline = startDeadline(JOB_DEADLINE_MS, async () => {
    timedOut = true;
    await updateQuiz(userId, quizId, { status: "failed", error: TOO_SLOW });
  });
  try {
    const quiz = await getQuiz(userId, quizId);
    if (!quiz) return;
    const chunks = await listChunks(userId, quiz.document_id);
    if (!chunks.length) throw new AppError("This document has no text to make a quiz from.");
    const ai = getAI();
    await updateQuiz(userId, quizId, { status: "generating", progress: 1, error: null });

    let last = 0;
    const questions = await buildQuiz(chunks, quiz.question_count, quiz.difficulty, ai, async (percent) => {
      const now = Date.now();
      if (now - last < 1500) return;
      last = now;
      await updateQuiz(userId, quizId, { progress: percent });
    });
    if (timedOut) return;
    await updateQuiz(userId, quizId, { questions, question_count: questions.length, status: "done", progress: 100 });
  } catch (e) {
    if (timedOut) return;
    const msg = e instanceof AIError ? e.message : userMessage(e, "Could not create the quiz. Please try again.");
    await updateQuiz(userId, quizId, { status: "failed", error: msg }).catch(() => {});
  } finally {
    cancelDeadline();
  }
}
