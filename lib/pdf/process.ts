import "server-only";
import { storage } from "@/lib/storage";
import { userMessage } from "@/lib/errors";
import { getDocument, replaceChunks, updateDocument } from "@/lib/db/documents";
import { runPipeline } from "./pipeline";

/** Background job: download PDF -> pipeline -> save chunks -> mark ready. Progress is written to the documents row. */
export async function processDocument(userId: string, docId: string) {
  try {
    const doc = await getDocument(userId, docId);
    if (!doc) return;
    await updateDocument(userId, docId, { status: "extracting", progress: 1, status_detail: "Opening your PDF", error: null });

    const bytes = await storage.get(doc.storage_path);
    let lastWrite = 0;
    let lastStage = "";
    const result = await runPipeline(new Uint8Array(bytes), async (p) => {
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

    await replaceChunks(userId, docId, result.chunks);
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
      error: userMessage(e, "Something went wrong while reading this PDF. Try again, or upload a different copy."),
    }).catch(() => {});
  }
}
