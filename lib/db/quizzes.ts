import "server-only";
import { LIMITS } from "@/lib/config";
import { IN_PROGRESS } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/server";
import { storedQuestionsSchema, type Difficulty, type PublicQuestion, type QuizQuestion } from "@/lib/quiz/schema";

export type QuizRow = {
  id: string;
  user_id: string;
  document_id: string;
  title: string;
  difficulty: Difficulty;
  questions: QuizQuestion[];
  saved: boolean;
  status: "pending" | "generating" | "done" | "failed";
  progress: number;
  error: string | null;
  question_count: number;
  created_at: string;
  updated_at: string;
};

export type AttemptRow = {
  id: string;
  user_id: string;
  quiz_id: string;
  answers: (number | null)[];
  score: number;
  total: number;
  created_at: string;
};

const db = () => supabaseAdmin();
function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Every query below filters by user_id so one user can never touch another user's rows. */

export async function createQuiz(userId: string, documentId: string, title: string, difficulty: Difficulty, count: number): Promise<QuizRow> {
  return must(
    await db()
      .from("quizzes")
      .insert({ user_id: userId, document_id: documentId, title, difficulty, questions: [], question_count: count, status: "pending" })
      .select()
      .single()
  ) as QuizRow;
}

export async function getQuiz(userId: string, id: string): Promise<QuizRow | null> {
  const row = must(await db().from("quizzes").select("*").eq("id", id).eq("user_id", userId).maybeSingle()) as QuizRow | null;
  if (!row) return null;
  // Questions come from our own database, but check the shape anyway so a bad row can never crash the quiz screen.
  const parsed = storedQuestionsSchema.safeParse(row.questions);
  return { ...row, questions: parsed.success ? (parsed.data as QuizQuestion[]) : [] };
}

export async function listQuizzesForDocument(userId: string, documentId: string) {
  return must(
    await db()
      .from("quizzes")
      .select("id,title,difficulty,status,progress,question_count,saved,created_at,updated_at")
      .eq("user_id", userId)
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })
  ) as Pick<QuizRow, "id" | "title" | "difficulty" | "status" | "progress" | "question_count" | "saved" | "created_at" | "updated_at">[];
}

export type SavedQuizListItem = {
  id: string;
  document_id: string;
  title: string;
  difficulty: Difficulty;
  question_count: number;
  created_at: string;
  document_name: string | null;
  attempts: number;
  best: { score: number; total: number } | null;
};

/** Saved quizzes with their attempt count and best score, for the "Saved quizzes" page. */
export async function listSavedQuizzes(userId: string): Promise<SavedQuizListItem[]> {
  const quizzes = must(
    await db()
      .from("quizzes")
      .select("id,document_id,title,difficulty,question_count,created_at,documents(name)")
      .eq("user_id", userId)
      .eq("saved", true)
      .eq("status", "done")
      .order("created_at", { ascending: false })
  ) as unknown as (Omit<SavedQuizListItem, "document_name" | "attempts" | "best"> & { documents: { name: string } | { name: string }[] | null })[];
  if (!quizzes.length) return [];

  const attempts = must(
    await db().from("quiz_attempts").select("quiz_id,score,total").eq("user_id", userId).in("quiz_id", quizzes.map((q) => q.id))
  ) as Pick<AttemptRow, "quiz_id" | "score" | "total">[];

  return quizzes.map((q) => {
    const mine = attempts.filter((a) => a.quiz_id === q.id);
    const best = mine.reduce<{ score: number; total: number } | null>(
      (b, a) => (!b || a.score / a.total > b.score / b.total ? { score: a.score, total: a.total } : b),
      null
    );
    const doc = Array.isArray(q.documents) ? q.documents[0] : q.documents;
    return {
      id: q.id,
      document_id: q.document_id,
      title: q.title,
      difficulty: q.difficulty,
      question_count: q.question_count,
      created_at: q.created_at,
      document_name: doc?.name ?? null,
      attempts: mine.length,
      best,
    };
  });
}

export async function updateQuiz(userId: string, id: string, patch: Partial<QuizRow>) {
  must(await db().from("quizzes").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId));
}

/** Rename / save from the UI. Returns false when the quiz does not exist (or belongs to someone else). */
export async function patchQuiz(userId: string, id: string, patch: { title?: string; saved?: boolean }): Promise<boolean> {
  const rows = must(
    await db().from("quizzes").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).select("id")
  ) as { id: string }[];
  return rows.length > 0;
}

export function isQuizStale(q: { status: string; updated_at: string }) {
  return IN_PROGRESS.includes(q.status) && Date.now() - new Date(q.updated_at).getTime() > LIMITS.stuckAfterSeconds * 1000;
}

/** Avoid starting the same quiz twice (e.g. double click). */
export async function findActiveQuiz(userId: string, documentId: string, difficulty: Difficulty, count: number): Promise<QuizRow | null> {
  const rows = must(
    await db()
      .from("quizzes")
      .select("*")
      .eq("user_id", userId)
      .eq("document_id", documentId)
      .eq("difficulty", difficulty)
      .eq("question_count", count)
      .in("status", ["pending", "generating"])
  ) as QuizRow[];
  return rows.find((r) => !isQuizStale(r)) ?? null;
}

export async function countActiveQuizzes(userId: string): Promise<number> {
  const rows = must(
    await db().from("quizzes").select("id,status,updated_at").eq("user_id", userId).in("status", ["pending", "generating"])
  ) as { id: string; status: string; updated_at: string }[];
  return rows.filter((r) => !isQuizStale(r)).length;
}

export async function removeQuiz(userId: string, id: string): Promise<boolean> {
  const rows = must(await db().from("quizzes").delete().eq("id", id).eq("user_id", userId).select("id")) as { id: string }[];
  return rows.length > 0; // attempts go with it (ON DELETE CASCADE)
}

/** The version of the questions that is safe to send to the browser while the quiz is being taken. */
export function toPublicQuestions(questions: QuizQuestion[]): PublicQuestion[] {
  return questions.map((q) => ({ question: q.question, options: q.options, sourcePage: q.sourcePage }));
}

// ---------- attempts ----------

export async function createAttempt(userId: string, quizId: string, answers: (number | null)[], score: number, total: number): Promise<AttemptRow> {
  return must(
    await db().from("quiz_attempts").insert({ user_id: userId, quiz_id: quizId, answers, score, total }).select().single()
  ) as AttemptRow;
}

export async function listAttempts(userId: string, quizId: string): Promise<AttemptRow[]> {
  return must(
    await db().from("quiz_attempts").select("*").eq("user_id", userId).eq("quiz_id", quizId).order("created_at", { ascending: false })
  ) as AttemptRow[];
}

export async function getAttempt(userId: string, quizId: string, attemptId: string): Promise<AttemptRow | null> {
  return (
    (must(
      await db().from("quiz_attempts").select("*").eq("id", attemptId).eq("quiz_id", quizId).eq("user_id", userId).maybeSingle()
    ) as AttemptRow | null) ?? null
  );
}
