import { LIMITS } from "@/lib/config";
import { mapLimit } from "@/lib/async";
import { cleanText } from "./clean";
import { chunkPages, type Chunk, type PageText } from "./chunk";
import { extractPageText, openPdf, PdfError } from "./extract";
import { createOcr, renderPagePng } from "./ocr";

export type Stage = "extracting" | "ocr" | "chunking";
export type Progress = (p: { stage: Stage; percent: number; detail: string; pageCount?: number }) => void | Promise<void>;
export type PipelineResult = { pageCount: number; ocrPages: number; chunks: Chunk[] };

/**
 * PDF bytes -> text per page (OCR only where needed) -> cleaned -> chunks with page numbers.
 * Free of database/framework code so it can be tested on its own.
 */
export async function runPipeline(data: Uint8Array, onProgress: Progress): Promise<PipelineResult> {
  const { doc: pdf, close } = await openPdf(data);
  try {
    const total = pdf.numPages;
    if (total > LIMITS.maxPages) throw new PdfError(`This PDF has ${total} pages. The limit is ${LIMITS.maxPages}.`);
    await onProgress({ stage: "extracting", percent: 3, detail: `Found ${total} pages`, pageCount: total });

    // 1. Read the text layer of every page.
    const pages: PageText[] = [];
    const scanned: number[] = [];
    for (let n = 1; n <= total; n++) {
      const page = await pdf.getPage(n);
      const text = cleanText(await extractPageText(page));
      page.cleanup();
      if (text.length < LIMITS.ocrMinChars) scanned.push(n);
      pages.push({ page: n, text, ocr: false });
      if (n % 5 === 0 || n === total) {
        await onProgress({ stage: "extracting", percent: 3 + Math.round((n / total) * 37), detail: `Reading page ${n} of ${total}` });
      }
    }

    // 2. OCR only the pages that had (almost) no text.
    if (scanned.length) {
      await onProgress({ stage: "ocr", percent: 40, detail: `Starting OCR for ${scanned.length} scanned page${scanned.length > 1 ? "s" : ""}` });
      const ocr = await createOcr(LIMITS.ocrMaxWorkers);
      try {
        let done = 0;
        await mapLimit(scanned, ocr.workers + 1, async (n) => {
          const page = await pdf.getPage(n);
          const png = await renderPagePng(page, LIMITS.ocrScale);
          page.cleanup();
          const text = cleanText(await ocr.recognize(png));
          pages[n - 1] = { page: n, text, ocr: true };
          done++;
          await onProgress({ stage: "ocr", percent: 40 + Math.round((done / scanned.length) * 50), detail: `OCR: page ${done} of ${scanned.length} scanned pages` });
        });
      } finally {
        await ocr.close();
      }
    }

    // 3. Chunk.
    await onProgress({ stage: "chunking", percent: 93, detail: "Preparing text for AI" });
    const chunks = chunkPages(pages, LIMITS.chunkChars);
    if (!chunks.length) throw new PdfError("No readable text was found in this PDF.");
    return { pageCount: total, ocrPages: scanned.length, chunks };
  } finally {
    await close();
  }
}
