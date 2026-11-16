import { AI_LIMITS } from "@/lib/config";
import { mapLimit } from "@/lib/async";
import type { AIProvider } from "@/lib/ai/types";
import { prompts, SYSTEM, type SummaryType } from "./prompts";

export type ChunkInput = { pageStart: number; pageEnd: number; content: string };
export type SummaryProgress = (percent: number, detail: string) => void | Promise<void>;

const pages = (c: ChunkInput) => (c.pageStart === c.pageEnd ? `Page ${c.pageStart}` : `Pages ${c.pageStart}–${c.pageEnd}`);

/**
 * Map-reduce summarisation. No database code here so it is easy to test.
 * - detailed / chapter / qa: one AI call per chunk, results kept in order (nothing is lost in a merge).
 * - quick: per-chunk key points, then merged in rounds until one final summary remains.
 */
export async function buildSummary(
  type: SummaryType,
  chunks: ChunkInput[],
  ai: AIProvider,
  onProgress: SummaryProgress
): Promise<string> {
  const total = chunks.length;
  let done = 0;
  const step = async (label: string, weight = 1) => {
    done += weight;
    await onProgress(Math.min(95, Math.round((done / (total + 2)) * 100)), label);
  };
  const run = (prompt: string, temperature = 0.3) => ai.generateText({ system: SYSTEM, prompt, temperature });

  if (type === "quick") {
    let notes = await mapLimit(chunks, AI_LIMITS.concurrency, async (c, i) => {
      const out = await run(prompts.quickMap(c.content));
      await step(`Reading part ${i + 1} of ${total}`);
      return out;
    });
    // Reduce in rounds until everything fits in one final call.
    while (notes.join("\n\n").length > AI_LIMITS.reduceChars) {
      const groups: string[][] = [];
      let cur: string[] = [];
      let len = 0;
      for (const n of notes) {
        if (cur.length && len + n.length > AI_LIMITS.reduceChars) {
          groups.push(cur);
          cur = [];
          len = 0;
        }
        cur.push(n);
        len += n.length;
      }
      if (cur.length) groups.push(cur);
      if (groups.length >= notes.length) break; // cannot shrink further
      notes = await mapLimit(groups, AI_LIMITS.concurrency, async (g) => run(prompts.quickReduce(g.join("\n\n"))));
      await step("Combining notes", 0.5);
    }
    const final = await run(prompts.quickFinal(notes.join("\n\n")));
    await onProgress(98, "Finishing");
    return final;
  }

  const make = type === "detailed" ? prompts.detailed : type === "chapter" ? prompts.chapter : prompts.qa;
  const parts = await mapLimit(chunks, AI_LIMITS.concurrency, async (c, i) => {
    const out = await run(make(c.content));
    await step(`Writing part ${i + 1} of ${total}`);
    return `## ${pages(c)}\n\n${out}`;
  });
  return parts.join("\n\n---\n\n");
}
