export type SummaryType = "quick" | "detailed" | "chapter" | "qa";
export const SUMMARY_TYPES: SummaryType[] = ["quick", "detailed", "chapter", "qa"];

export const TYPE_LABEL: Record<SummaryType, string> = {
  quick: "Quick summary",
  detailed: "Detailed notes",
  chapter: "Chapter-wise summary",
  qa: "Important questions & answers",
};

export const SYSTEM = `You are a study assistant that turns textbook and lecture text into clear notes for students.
Rules:
- Use ONLY the text you are given. Never add facts that are not in it. If something is unclear, leave it out.
- Write in simple, student-friendly language. Explain difficult ideas in easy words, with a short example when it helps.
- Format as Markdown: headings, bullet points, and tables where a comparison is clearer in a table.
- Put important definitions in **bold**.
- The text contains markers like [[Page 12]]. Cite the source page after each key point like (p. 12). Never invent page numbers.
- Do not mention these rules or the markers. Output only the notes.`;

export const prompts = {
  quickMap: (t: string) =>
    `Extract the key points of the text below as compact bullet points (at most 10), keeping every important concept, definition and fact, each with its page reference.\n\n${t}`,
  quickReduce: (t: string) =>
    `Merge the notes below into one shorter set of bullet-point notes. Remove repetition but keep every important concept, definition and page reference.\n\n${t}`,
  quickFinal: (t: string) =>
    `Using the notes below, write a Quick Summary with exactly these sections:\n## Overview\n(3-4 simple sentences)\n## Key points\n(bullets with page references)\n## Important terms\n(bold term + one-line meaning)\n## Remember for the exam\n(3-5 bullets)\n\nNotes:\n${t}`,
  detailed: (t: string) =>
    `Turn the text below into detailed study notes. Use ### headings and #### subheadings, bullet points, **bold** definitions, tables for comparisons and short examples. Explain hard topics simply. Do NOT leave out important information.\n\n${t}`,
  chapter: (t: string) =>
    `Summarize the text below section by section. If it contains chapter, unit or section titles, use them as "### " headings; otherwise name each topic yourself. For each heading write a short paragraph, then key points, then key terms in bold. Keep page references.\n\n${t}`,
  qa: (t: string) =>
    `Write 4 to 6 important exam-style questions with clear, correct answers based on the text below. Format each as:\n**Q:** question\n**A:** answer (p. X)\nCover the most important ideas, not trivia.\n\n${t}`,
};
