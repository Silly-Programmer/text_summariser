import "server-only";
import { QUIZ_LIMITS } from "@/lib/config";
import { listChunks } from "@/lib/db/documents";
import { chunkCapacity } from "./build";

const cache = new Map<string, number>();

/**
 * The most questions a document can really supply (never more than the 30 maximum).
 * Each chunk of text can supply a limited number of questions, so a short PDF cannot give 30.
 * Cached per document version, so the document page does not re-read all the text on every visit.
 */
export async function getQuizCapacity(userId: string, doc: { id: string; updated_at: string }): Promise<number> {
  const key = `${userId}:${doc.id}:${doc.updated_at}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const chunks = await listChunks(userId, doc.id);
  const total = chunks.reduce((sum, c) => sum + chunkCapacity(c.content.length), 0);
  const capacity = Math.min(QUIZ_LIMITS.maxQuestions, total);

  if (cache.size >= 200) cache.delete(cache.keys().next().value as string);
  cache.set(key, capacity);
  return capacity;
}
