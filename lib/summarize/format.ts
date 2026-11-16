/**
 * Make every Q&A pair look the same. The AI sometimes puts "**A:**" on the same line as the question
 * and sometimes on the next line, and Markdown joins single line breaks into one line.
 * This puts each question on its own paragraph, with the answer on the line directly below it.
 * It only touches the exact "**Q:**" and "**A:**" markers, so other notes are left alone.
 */
export function formatQa(md: string): string {
  return md
    .replace(/\s*\*\*Q:\*\*/g, "\n\n**Q:**")
    .replace(/\s*\*\*A:\*\*/g, "  \n**A:**") // two spaces + newline = a line break inside the same paragraph
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
