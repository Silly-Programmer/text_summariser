import "server-only";
import { unstable_cache } from "next/cache";
import { QUIZ_LIMITS } from "@/lib/config";
import { listChunks } from "@/lib/db/documents";
import { chunkCapacity } from "./build";

async function compute(userId: string, docId: string): Promise<number> {
  const chunks = await listChunks(userId, docId);
  const total = chunks.reduce((sum, c) => sum + chunkCapacity(c.content.length), 0);
  return Math.min(QUIZ_LIMITS.maxQuestions, total);
}

/**
 * The most questions a document can really supply (never more than the 30 maximum).
 * Working it out needs all of the document's text, which can be megabytes, so the result is kept in
 * Next.js's shared data cache (it survives across serverless instances; an in-memory Map does not).
 * The key includes updated_at, so re-processing a document recalculates it.
 */
export async function getQuizCapacity(userId: string, doc: { id: string; updated_at: string }): Promise<number> {
  try {
    return await unstable_cache(() => compute(userId, doc.id), ["quiz-capacity", userId, doc.id, doc.updated_at], {
      revalidate: 60 * 60 * 24,
    })();
  } catch {
    return compute(userId, doc.id); // if the cache is unavailable, just calculate it
  }
}
