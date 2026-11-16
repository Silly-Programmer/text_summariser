import { mapLimit } from "@/lib/async";
import { AI_LIMITS, QUIZ_LIMITS } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { AIError, type AIProvider } from "@/lib/ai/types";
import { QUIZ_SYSTEM, quizPrompt } from "./prompts";
import { aiQuestionSchema, extractJsonArray, type Difficulty, type QuizQuestion } from "./schema";

// No database or Next.js code here, so it is easy to test.

export type ChunkInput = { pageStart: number; pageEnd: number; content: string };
export type QuizProgress = (percent: number) => void | Promise<void>;

/** 0,4,2,6,1,5,3,7 ...: any prefix of this order is spread evenly over 0..n-1. */
function spreadOrder(n: number): number[] {
  const bits = Math.ceil(Math.log2(Math.max(2, n)));
  const rev = (i: number) => {
    let r = 0;
    for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
    return r;
  };
  return Array.from({ length: n }, (_, i) => i).sort((a, b) => rev(a) - rev(b));
}

/** How many questions each chunk can supply, based on how much text it has. */
export function chunkCapacity(length: number): number {
  if (length < QUIZ_LIMITS.minChunkChars) return 0;
  return Math.max(1, Math.min(QUIZ_LIMITS.perChunkMax, Math.floor(length / QUIZ_LIMITS.charsPerQuestion)));
}

/**
 * Decide how many questions to ask from each chunk, so the quiz covers the whole document.
 * - Fewer questions than chunks: one question from chunks spread evenly over the document.
 * - More questions than chunks: every chunk gets some, longer chunks get more.
 * The total is capped by what the document can supply.
 */
export function allocate(lengths: number[], target: number): number[] {
  const caps = lengths.map(chunkCapacity);
  const eligible = caps.map((c, i) => (c > 0 ? i : -1)).filter((i) => i >= 0);
  const total = Math.min(target, caps.reduce((a, b) => a + b, 0));
  const out = new Array<number>(lengths.length).fill(0);
  if (!eligible.length || total <= 0) return out;

  const order = spreadOrder(eligible.length); // rank used to break ties so questions spread out
  const rank = new Map(order.map((pos, r) => [eligible[pos], r]));

  if (total <= eligible.length) {
    for (const pos of order.slice(0, total)) out[eligible[pos]] = 1;
    return out;
  }
  for (const i of eligible) out[i] = 1;
  for (let left = total - eligible.length; left > 0; left--) {
    let best = -1;
    for (const i of eligible) {
      if (out[i] >= caps[i]) continue;
      if (best === -1) best = i;
      else {
        const a = out[i] / caps[i];
        const b = out[best] / caps[best];
        if (a < b || (a === b && rank.get(i)! < rank.get(best)!)) best = i;
      }
    }
    if (best === -1) break;
    out[best]++;
  }
  return out;
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

const words = (s: string) => new Set(norm(s).split(" ").filter((w) => w.length > 2));

/** True when two questions are the same or nearly the same (word overlap of 70% or more). */
export function isDuplicate(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  const wa = words(a);
  const wb = words(b);
  if (!wa.size || !wb.size) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / (wa.size + wb.size - shared) >= 0.7;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Validate the AI's answer with Zod. Bad items are dropped one by one (one bad question does not
 * lose the whole batch). Options are shuffled so the correct answer is not always in the same place.
 */
export function parseQuestions(raw: string, chunk: ChunkInput, difficulty: Difficulty): QuizQuestion[] {
  const items = extractJsonArray(raw);
  if (!items) return [];
  const out: QuizQuestion[] = [];
  for (const item of items) {
    const parsed = aiQuestionSchema.safeParse(item);
    if (!parsed.success) continue;
    const q = parsed.data;
    const distinct = new Set(q.options.map(norm));
    if (distinct.size !== 4) continue; // repeated options

    let page: number | null = q.sourcePage ?? null;
    if (page !== null && (page < chunk.pageStart || page > chunk.pageEnd)) page = null; // never keep a made-up page
    if (page === null && chunk.pageStart === chunk.pageEnd) page = chunk.pageStart;

    const correctText = q.options[q.correctAnswer];
    const options = shuffle(q.options);
    out.push({
      question: q.question,
      options: options as QuizQuestion["options"],
      correctAnswer: options.indexOf(correctText) as QuizQuestion["correctAnswer"],
      explanation: q.explanation,
      difficulty,
      sourcePage: page,
    });
  }
  return out;
}

/** Ask the AI for `need` questions from one chunk; retries on bad JSON, too few valid questions or duplicates. */
async function questionsForChunk(
  ai: AIProvider,
  chunk: ChunkInput,
  need: number,
  difficulty: Difficulty,
  existing: QuizQuestion[]
): Promise<QuizQuestion[]> {
  const got: QuizQuestion[] = [];
  for (let attempt = 0; attempt < QUIZ_LIMITS.attemptsPerRequest && got.length < need; attempt++) {
    const avoid = [...existing, ...got].map((q) => q.question).slice(-30);
    let raw: string;
    try {
      raw = await ai.generateText({
        system: QUIZ_SYSTEM,
        prompt: quizPrompt(chunk.content, need - got.length, difficulty, avoid),
        temperature: 0.4,
        maxOutputTokens: 8192,
      });
    } catch (e) {
      // The AI refused or returned nothing for this part: try again, then move on. Other errors (bad key, rate limit) stop the job.
      if (e instanceof AIError && (e.code === "blocked" || e.code === "empty")) continue;
      throw e;
    }
    for (const q of parseQuestions(raw, chunk, difficulty)) {
      if (got.length >= need) break;
      if ([...existing, ...got].some((x) => isDuplicate(x.question, q.question))) continue; // duplicate filtering
      got.push(q);
    }
  }
  return got;
}

/**
 * Build a quiz of up to `count` questions covering the whole document.
 * Questions per chunk are planned first, then generated with limited concurrency; any shortfall
 * (invalid or duplicate questions) is topped up in extra rounds.
 */
export async function buildQuiz(
  chunks: ChunkInput[],
  count: number,
  difficulty: Difficulty,
  ai: AIProvider,
  onProgress: QuizProgress
): Promise<QuizQuestion[]> {
  const lengths = chunks.map((c) => c.content.length);
  const plan = allocate(lengths, count);
  const target = plan.reduce((a, b) => a + b, 0);
  if (target === 0) throw new AppError("This document does not have enough text to make a quiz.");

  const found: { chunk: number; q: QuizQuestion }[] = [];
  const totalSteps = plan.filter((n) => n > 0).length + QUIZ_LIMITS.topUpRounds;
  let done = 0;
  const step = async () => {
    done++;
    await onProgress(Math.min(95, Math.round((done / (totalSteps + 1)) * 100)));
  };

  const runRound = async (round: number[]) => {
    const jobs = round.map((n, i) => ({ n, i })).filter((j) => j.n > 0);
    const results = await mapLimit(jobs, AI_LIMITS.concurrency, async ({ n, i }) => {
      const existing = found.filter((f) => f.chunk === i).map((f) => f.q);
      return { i, qs: await questionsForChunk(ai, chunks[i], n, difficulty, existing) };
    });
    // Merge after the round so two chunks cannot add near-identical questions at the same time.
    for (const { i, qs } of results) {
      for (const q of qs) {
        if (found.some((f) => isDuplicate(f.q.question, q.question))) continue;
        found.push({ chunk: i, q });
      }
      await step();
    }
  };

  await runRound(plan);
  for (let r = 0; r < QUIZ_LIMITS.topUpRounds && found.length < target; r++) {
    const topUp = allocate(lengths, target - found.length);
    await runRound(topUp);
  }

  if (!found.length) throw new AppError("The AI could not write valid questions for this document. Please try again.");

  return found
    .slice(0, target)
    .sort((a, b) => a.chunk - b.chunk || (a.q.sourcePage ?? 1e9) - (b.q.sourcePage ?? 1e9))
    .map((f) => f.q);
}
