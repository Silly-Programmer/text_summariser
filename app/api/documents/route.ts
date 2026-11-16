import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { LIMITS } from "@/lib/config";
import { AppError, errorResponse } from "@/lib/errors";
import { formatBytes } from "@/lib/format";
import { createDocument } from "@/lib/db/documents";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Step 1 of an upload. The PDF itself is NOT sent here: Vercel rejects request bodies over 4.5 MB.
 * We create the document row and hand back a one-time URL; the browser uploads straight to storage,
 * then calls POST /api/documents/[id]/start.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => null)) as { name?: unknown; size?: unknown } | null;
    const size = Number(body?.size);
    const rawName = typeof body?.name === "string" ? body.name : "";

    if (!Number.isFinite(size) || size <= 0) throw new AppError("This file is empty.");
    if (size > LIMITS.maxPdfBytes) {
      throw new AppError(`This file is ${formatBytes(size)}. The limit is ${formatBytes(LIMITS.maxPdfBytes)}.`, 413);
    }
    if (!/\.pdf$/i.test(rawName)) throw new AppError("Please choose a PDF file.", 415);

    const name = rawName.replace(/[\u0000-\u001F<>:"/\\|?*]/g, "").slice(0, 150) || "Untitled.pdf";
    const doc = await createDocument(userId, name, size);
    const uploadUrl = await storage.createUploadUrl(doc.storage_path);
    return NextResponse.json({ id: doc.id, uploadUrl }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
