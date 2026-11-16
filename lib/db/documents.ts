import "server-only";
import { randomUUID } from "node:crypto";
import { LIMITS } from "@/lib/config";
import { IN_PROGRESS } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Chunk } from "@/lib/pdf/chunk";

export type DocumentRow = {
  id: string;
  user_id: string;
  name: string;
  storage_path: string;
  size_bytes: number;
  page_count: number | null;
  status: "uploaded" | "extracting" | "ocr" | "chunking" | "ready" | "failed";
  progress: number;
  status_detail: string | null;
  ocr_pages: number;
  error: string | null;
  created_at: string;
  updated_at: string;
};

const db = () => supabaseAdmin();
function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Every query below filters by user_id so one user can never touch another user's rows. */
export async function createDocument(userId: string, name: string, size: number): Promise<DocumentRow> {
  const id = randomUUID();
  return must(
    await db()
      .from("documents")
      .insert({ id, user_id: userId, name, size_bytes: size, storage_path: `${userId}/${id}.pdf`, status: "uploaded" })
      .select()
      .single()
  ) as DocumentRow;
}

export async function getDocument(userId: string, id: string): Promise<DocumentRow | null> {
  return (must(await db().from("documents").select("*").eq("id", id).eq("user_id", userId).maybeSingle()) as DocumentRow | null) ?? null;
}

export async function listDocuments(userId: string): Promise<DocumentRow[]> {
  return must(await db().from("documents").select("*").eq("user_id", userId).order("created_at", { ascending: false })) as DocumentRow[];
}

export async function updateDocument(userId: string, id: string, patch: Partial<DocumentRow>) {
  must(await db().from("documents").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId));
}

export async function removeDocument(userId: string, id: string): Promise<DocumentRow | null> {
  const rows = must(await db().from("documents").delete().eq("id", id).eq("user_id", userId).select()) as DocumentRow[];
  return rows[0] ?? null;
}

export function isStale(d: { status: string; updated_at: string }) {
  return IN_PROGRESS.includes(d.status) && Date.now() - new Date(d.updated_at).getTime() > LIMITS.stuckAfterSeconds * 1000;
}

export async function replaceChunks(userId: string, documentId: string, chunks: Chunk[]) {
  must(await db().from("document_chunks").delete().eq("document_id", documentId).eq("user_id", userId));
  for (let i = 0; i < chunks.length; i += 20) {
    const rows = chunks.slice(i, i + 20).map((c) => ({
      document_id: documentId,
      user_id: userId,
      chunk_index: c.index,
      page_start: c.pageStart,
      page_end: c.pageEnd,
      content: c.content,
      used_ocr: c.usedOcr,
    }));
    must(await db().from("document_chunks").insert(rows));
  }
}

export async function listChunks(userId: string, documentId: string) {
  const rows = must(
    await db()
      .from("document_chunks")
      .select("chunk_index,page_start,page_end,content")
      .eq("document_id", documentId)
      .eq("user_id", userId)
      .order("chunk_index")
  ) as { chunk_index: number; page_start: number; page_end: number; content: string }[];
  return rows.map((r) => ({ pageStart: r.page_start, pageEnd: r.page_end, content: r.content }));
}
