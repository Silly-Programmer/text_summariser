import "server-only";
import { storage } from "@/lib/storage";
import { userMessage } from "@/lib/errors";
import { JOB_DEADLINE_MS } from "@/lib/config";
import { startDeadline } from "@/lib/async";
import { getDocument, replaceChunks, updateDocument } from "@/lib/db/documents";
import { PdfError } from "./extract";
import { runPipeline } from "./pipeline";

const TOO_SLOW =
  "This PDF is too big or too slow to read within the hosting time limit (scanned pages are the slowest). Try a shorter PDF, or split this one into smaller parts.";

/** Background job: download PDF -> pipeline -> save chunks -> mark ready. Progress is written to the documents row. */
export async function processDocument(userId: string, docId: string) {
  let timedOut = false;
  // Vercel kills the function at its time limit without any warning. Fail a little earlier, with a clear message,
  // so the user never sees a progress bar that is stuck forever.
  const cancelDeadline = startDeadline(JOB_DEADLINE_MS, async () => {
    timedOut = true;
    await updateDocument(userId, docId, { status: "failed", status_detail: null, error: TOO_SLOW });
  });

  try {
    const doc = await getDocument(userId, docId);
    if (!doc) return;
    await updateDocument(userId, docId, { status: "extracting", progress: 1, status_detail: "Opening your PDF", error: null });

    const bytes = await storage.get(doc.storage_path);
    if (!bytes.subarray(0, 1024).toString("latin1").includes("%PDF-")) {
      throw new PdfError("This does not look like a PDF file.");
    }

    let lastWrite = 0;
    let lastStage = "";
    const result = await runPipeline(new Uint8Array(bytes), async (p) => {
      if (timedOut) throw new PdfError(TOO_SLOW); // stop working: the job was already marked as failed
      const now = Date.now();
      if (p.stage === lastStage && !p.pageCount && now - lastWrite < 1500) return; // don't write on every page
      lastWrite = now;
      lastStage = p.stage;
      await updateDocument(userId, docId, {
        status: p.stage,
        progress: p.percent,
        status_detail: p.detail,
        ...(p.pageCount ? { page_count: p.pageCount } : {}),
      });
    });
    if (timedOut) return;

    await replaceChunks(userId, docId, result.chunks);
    if (timedOut) return;
    await updateDocument(userId, docId, {
      status: "ready",
      progress: 100,
      status_detail: null,
      page_count: result.pageCount,
      ocr_pages: result.ocrPages,
      error: null,
    });
  } catch (e) {
    await updateDocument(userId, docId, {
      status: "failed",
      status_detail: null,
      error: timedOut ? TOO_SLOW : userMessage(e, "Something went wrong while reading this PDF. Try again, or upload a different copy."),
    }).catch(() => {});
  } finally {
    cancelDeadline();
  }
}
