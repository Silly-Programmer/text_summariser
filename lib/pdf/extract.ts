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
  return (pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs"));
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
