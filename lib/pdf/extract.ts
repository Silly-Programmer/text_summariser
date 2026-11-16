import path from "node:path";

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
export type PdfDoc = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;
export type PdfPage = Awaited<ReturnType<PdfDoc["getPage"]>>;

/** Errors safe to show the user. Thrown as plain Error with a `userFacing` flag so this file stays framework-free. */
export class PdfError extends Error {
  userFacing = true;
}

let pdfjsPromise: Promise<PdfJs> | null = null;
export function loadPdfjs() {
  return (pdfjsPromise ??= (async () => {
    // pdfjs normally finds its worker file with a runtime string import("./pdf.worker.mjs"), which
    // Vercel's file tracing cannot see, so the file is missing in production ("fake worker failed").
    // Importing it here with a plain string makes it part of the deployed bundle, and pdfjs
    // picks it up from globalThis.pdfjsWorker without looking for a file.
    // @ts-ignore - the worker file ships without type declarations
    const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
    return import("pdfjs-dist/legacy/build/pdf.mjs");
  })());
}

// pdfjs needs these URLs to end with "/" (even on Windows, where path.sep is "\").
const assetDir = (name: string) => path.join(process.cwd(), "node_modules", "pdfjs-dist", name).replace(/\\/g, "/") + "/";

export async function openPdf(data: Uint8Array): Promise<{ doc: PdfDoc; close: () => Promise<void> }> {
  const pdfjs = await loadPdfjs();
  try {
    const task = pdfjs.getDocument({
      data,
      useSystemFonts: true,
      verbosity: 0,
      standardFontDataUrl: assetDir("standard_fonts"),
      cMapUrl: assetDir("cmaps"),
      cMapPacked: true,
      wasmUrl: assetDir("wasm"), // JPEG2000 / JBIG2 decoders: common in scanned PDFs
      iccUrl: assetDir("iccs"),
    });
    const doc = await task.promise;
    return { doc, close: () => task.destroy() };
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === "PasswordException") {
      throw new PdfError("This PDF is password-protected. Remove the password and upload it again.");
    }
    if (name === "InvalidPDFException" || name === "FormatError" || name === "MissingPDFException") {
      throw new PdfError("This file looks corrupted or is not a valid PDF.");
    }
    throw e;
  }
}

export async function extractPageText(page: PdfPage): Promise<string> {
  const content = await page.getTextContent();
  let out = "";
  for (const item of content.items) {
    if ("str" in item) out += item.str + (item.hasEOL ? "\n" : " ");
  }
  return out;
}
