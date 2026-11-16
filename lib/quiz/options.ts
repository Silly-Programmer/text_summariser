// Safe to import from client components (no server code, no environment variables).
export const QUIZ_COUNTS = [5, 10, 15, 20, 30] as const;
export const DEFAULT_QUIZ_COUNT = 10;
const MIN_QUESTIONS = 3; // keep equal to QUIZ_LIMITS.minQuestions and the API's minimum

/**
 * The question counts to offer for a document that can supply `max` questions.
 * Only counts the document can really give are shown; the max itself is added if it is not a preset
 * (e.g. a short PDF that can give 12 shows 5, 10, 12). Empty list = too short for a quiz.
 */
export function quizCountOptions(max: number): number[] {
  const m = Math.floor(max);
  if (!(m >= MIN_QUESTIONS)) return [];
  const options: number[] = QUIZ_COUNTS.filter((n) => n <= m);
  if (!options.includes(m)) options.push(m);
  return options;
}

export function defaultQuizCount(options: number[]): number {
  return options.includes(DEFAULT_QUIZ_COUNT) ? DEFAULT_QUIZ_COUNT : (options[options.length - 1] ?? DEFAULT_QUIZ_COUNT);
}
