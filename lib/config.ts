// Central place for tunable limits.
export const LIMITS = {
  maxPdfBytes: 50 * 1024 * 1024, // Supabase free tier caps a single file at 50 MB
  maxPages: 2000,
  ocrMinChars: 40, // a page with fewer characters than this is treated as scanned
  ocrScale: 2, // render scale for OCR (2 ≈ 150 dpi)
  ocrMaxWorkers: 3,
  chunkChars: 24_000, // ≈ 6k tokens per chunk
  stuckAfterSeconds: 180, // show a "retry" button if no progress for this long
};

// Vercel kills a function at its maxDuration (300 s is the most the free Hobby plan allows).
// Background jobs give up a little earlier so the user sees a clear message instead of a bar stuck forever.
export const JOB_DEADLINE_MS = 265_000;

export const AI_LIMITS = {
  concurrency: Number(process.env.AI_CONCURRENCY) || 2,
  reduceChars: 40_000, // max size of notes merged in one reduce step
  maxActiveJobs: 3, // summaries + quizzes a user can have generating at the same time (protects the AI quota)
};

export const QUIZ_LIMITS = {
  minQuestions: 3,
  maxQuestions: 30,
  perChunkMax: 20, // never ask for more than this from one 24k-character chunk
  charsPerQuestion: 800, // a chunk can supply about one question per this many characters
  minChunkChars: 400, // chunks with less text than this are skipped
  attemptsPerRequest: 3, // tries per chunk when the AI returns bad JSON or too few valid questions
  topUpRounds: 2, // extra rounds to replace questions lost to validation / duplicate filtering
};
