import { after, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { LIMITS } from "@/lib/config";
import { AppError, errorResponse } from "@/lib/errors";
import { formatBytes } from "@/lib/format";
import { createDocument, removeDocument } from "@/lib/db/documents";
import { storage } from "@/lib/storage";
import { processDocument } from "@/lib/pdf/process";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new AppError("Choose a PDF file to upload.");
    if (file.size === 0) throw new AppError("This file is empty.");
    if (file.size > LIMITS.maxPdfBytes) {
      throw new AppError(`This file is ${formatBytes(file.size)}. The limit is ${formatBytes(LIMITS.maxPdfBytes)}.`, 413);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!bytes.subarray(0, 1024).toString("latin1").includes("%PDF-")) {
      throw new AppError("This does not look like a PDF file.", 415);
    }

    const name = file.name.replace(/[\u0000-\u001F<>:"/\\|?*]/g, "").slice(0, 150) || "Untitled.pdf";
    const doc = await createDocument(userId, name, file.size);
    try {
      await storage.put(doc.storage_path, bytes);
    } catch (e) {
      await removeDocument(userId, doc.id).catch(() => {});
      throw e;
    }

    after(() => processDocument(userId, doc.id)); // runs after the response is sent
    return NextResponse.json({ id: doc.id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
