import "server-only";
import { getAI } from "@/lib/ai";
import { JOB_DEADLINE_MS } from "@/lib/config";
import { startDeadline } from "@/lib/async";
import { AppError, userMessage } from "@/lib/errors";
import { AIError } from "@/lib/ai/types";
import { listChunks } from "@/lib/db/documents";
import { getSummary, updateSummary } from "@/lib/db/summaries";
import { buildSummary } from "./build";

const TOO_SLOW = "This took longer than the hosting time limit allows. Try a Quick summary, or use a shorter PDF.";

/** Background job: load chunks -> map-reduce with the AI -> save the result on the summaries row. */
export async function generateSummary(userId: string, summaryId: string) {
  let timedOut = false;
  // Fail with a clear message just before the host would silently kill this job.
  const cancelDeadline = startDeadline(JOB_DEADLINE_MS, async () => {
    timedOut = true;
    await updateSummary(userId, summaryId, { status: "failed", error: TOO_SLOW });
  });
  try {
    const s = await getSummary(userId, summaryId);
    if (!s) return;
    const chunks = await listChunks(userId, s.document_id);
    if (!chunks.length) throw new AppError("This document has no text to summarize.");
    const ai = getAI();
    await updateSummary(userId, summaryId, { status: "generating", progress: 1, error: null });

    let last = 0;
    const content = await buildSummary(s.type, chunks, ai, async (percent) => {
      const now = Date.now();
      if (now - last < 1500) return;
      last = now;
      await updateSummary(userId, summaryId, { progress: percent });
    });
    if (timedOut) return;
    await updateSummary(userId, summaryId, { content, status: "done", progress: 100 });
  } catch (e) {
    if (timedOut) return;
    const msg = e instanceof AIError ? e.message : userMessage(e, "Could not create the summary. Please try again.");
    await updateSummary(userId, summaryId, { status: "failed", error: msg }).catch(() => {});
  } finally {
    cancelDeadline();
  }
}
