import type { Difficulty } from "./schema";

export const QUIZ_SYSTEM = `You write multiple-choice exam questions for students from textbook text.
Rules:
- Use ONLY the text you are given. Never use outside knowledge. Every question must be answerable from the text.
- Each question has exactly 4 options. Exactly ONE option is correct; the other three are plausible but clearly wrong according to the text.
- Do not write "all of the above", "none of the above" or "both A and B". Keep the options similar in length.
- Test understanding of important ideas, not trivia, page numbers or the layout of the text.
- The text contains markers like [[Page 12]]. For each question, set sourcePage to the page number where the answer is found. Never invent a page number.
- Never mention "the text", "the passage" or the markers inside a question; write questions that make sense on their own.
- Output ONLY a JSON array. No Markdown, no code fences, no commentary.`;

const DIFFICULTY_HINT: Record<Difficulty, string> = {
  Easy: "Easy: direct recall of key definitions and facts stated clearly in the text.",
  Medium: "Medium: understanding and simple application; the student must explain or distinguish ideas, not just recall words.",
  Hard: "Hard: analysis and reasoning across several points in the text, close distractors, and cases that need careful reading.",
};

const FORMAT = `Each array item must look exactly like this:
{"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "B", "explanation": "One or two sentences saying why the answer is right.", "sourcePage": 12}
"correctAnswer" is the letter (A, B, C or D) of the correct option. Spread the correct answers across A, B, C and D.`;

export function quizPrompt(text: string, count: number, difficulty: Difficulty, avoid: string[]) {
  const avoidBlock = avoid.length
    ? `\nDo NOT repeat or rephrase these questions that already exist:\n${avoid.map((q) => `- ${q}`).join("\n")}\n`
    : "";
  return `Write exactly ${count} multiple-choice question${count === 1 ? "" : "s"} from the text below.
Difficulty: ${DIFFICULTY_HINT[difficulty]}
${FORMAT}
${avoidBlock}
Text:
${text}`;
}
