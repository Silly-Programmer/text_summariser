import os from "node:os";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { createScheduler, createWorker } from "tesseract.js";
import type { PdfPage } from "./extract";

/** Render one PDF page to a PNG image for OCR. */
export async function renderPagePng(page: PdfPage, scale: number): Promise<Buffer> {
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.render({ canvasContext: ctx as any, canvas: canvas as any, viewport }).promise;
  return canvas.toBuffer("image/png");
}

export type Ocr = { workers: number; recognize: (png: Buffer) => Promise<string>; close: () => Promise<void> };

/** Starts a small pool of Tesseract workers using the English data bundled in node_modules (no download). */
export async function createOcr(maxWorkers: number): Promise<Ocr> {
  const workers = Math.max(1, Math.min(maxWorkers, os.cpus().length - 1));
  const langPath = path.join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int");
  const scheduler = createScheduler();
  for (let i = 0; i < workers; i++) {
    const w = await createWorker("eng", 1, { langPath, gzip: true, cacheMethod: "none" });
    scheduler.addWorker(w);
  }
  return {
    workers,
    recognize: async (png) => (await scheduler.addJob("recognize", png)).data.text,
    close: async () => {
      await scheduler.terminate();
    },
  };
}
