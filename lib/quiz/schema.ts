import { z } from "zod";

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** A question as stored in the database and used by the app. `correctAnswer` is the index (0-3) of the right option. */
export type QuizQuestion = {
  question: string;
  options: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  explanation: string;
  difficulty: Difficulty;
  sourcePage: number | null;
};

/** What the browser gets while taking a quiz: no answers, no explanations. */
export type PublicQuestion = Pick<QuizQuestion, "question" | "options" | "sourcePage">;

const LETTERS = ["A", "B", "C", "D"] as const;

/** One question as the AI returns it. The AI says the answer as a letter (A-D); we turn it into an index. */
export const aiQuestionSchema = z.object({
  question: z.string().trim().min(10).max(600),
  options: z.array(z.string().trim().min(1).max(300)).length(4),
  correctAnswer: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase().replace(/[^A-D]/g, "").slice(0, 1))
    .pipe(z.enum(LETTERS))
    .transform((v) => LETTERS.indexOf(v) as 0 | 1 | 2 | 3),
  explanation: z.string().trim().min(10).max(1000),
  sourcePage: z.coerce.number().int().positive().nullable().optional().catch(null),
});
export type AiQuestion = z.infer<typeof aiQuestionSchema>;

/** Strict check of what we read back from the database (and what we are about to save). */
export const storedQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
  correctAnswer: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  explanation: z.string(),
  difficulty: z.enum(DIFFICULTIES),
  sourcePage: z.number().int().positive().nullable(),
});
export const storedQuestionsSchema = z.array(storedQuestionSchema);

/** Body of POST /api/documents/[id]/quizzes */
export const createQuizBody = z.object({
  count: z.number().int().min(3).max(30),
  difficulty: z.enum(DIFFICULTIES),
});

/** Body of POST /api/quizzes/[id]/attempts: selected option per question (null = skipped). */
export const attemptBody = z.object({
  answers: z.array(z.number().int().min(0).max(3).nullable()).min(1).max(100),
});

/** Body of PATCH /api/summaries/[id] and /api/quizzes/[id] */
export const patchBody = z
  .object({
    title: z.string().trim().min(1, "Enter a name.").max(120, "Use at most 120 characters.").optional(),
    saved: z.boolean().optional(),
  })
  .refine((v) => v.title !== undefined || v.saved !== undefined, { message: "Nothing to change." });

/** Pull a JSON array out of an AI answer (handles ```json fences and stray text around it). */
export function extractJsonArray(raw: string): unknown[] | null {
  const text = raw.replace(/```(?:json)?/gi, "").trim();
  const start = text.indexOf("[");
  if (start === -1) return null;
  const tryParse = (s: string): unknown[] | null => {
    try {
      const parsed: unknown = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };
  const end = text.lastIndexOf("]");
  if (end > start) {
    const whole = tryParse(text.slice(start, end + 1));
    if (whole) return whole;
  }
  // The answer may have been cut off mid-way: keep every complete item before the cut.
  const lastObjectEnd = text.lastIndexOf("}");
  if (lastObjectEnd > start) return tryParse(text.slice(start, lastObjectEnd + 1) + "]");
  return null;
}
