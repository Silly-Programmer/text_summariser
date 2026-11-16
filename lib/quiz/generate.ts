import "server-only";
import { getAI } from "@/lib/ai";
import { AIError } from "@/lib/ai/types";
import { AppError, userMessage } from "@/lib/errors";
import { listChunks } from "@/lib/db/documents";
import { getQuiz, updateQuiz } from "@/lib/db/quizzes";
import { buildQuiz } from "./build";

/** Background job: load chunks -> ask the AI per chunk -> validate with Zod -> save the questions on the quizzes row. */
export async function generateQuiz(userId: string, quizId: string) {
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
    await updateQuiz(userId, quizId, { questions, question_count: questions.length, status: "done", progress: 100 });
  } catch (e) {
    const msg = e instanceof AIError ? e.message : userMessage(e, "Could not create the quiz. Please try again.");
    await updateQuiz(userId, quizId, { status: "failed", error: msg }).catch(() => {});
  }
}
