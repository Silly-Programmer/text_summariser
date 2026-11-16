import "server-only";
import { LIMITS } from "@/lib/config";
import { IN_PROGRESS } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { SummaryType } from "@/lib/summarize/prompts";

export type SummaryRow = {
  id: string;
  user_id: string;
  document_id: string;
  title: string;
  type: SummaryType;
  content: string;
  saved: boolean;
  status: "pending" | "generating" | "done" | "failed";
  progress: number;
  error: string | null;
  created_at: string;
  updated_at: string;
};

const db = () => supabaseAdmin();
function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function createSummary(userId: string, documentId: string, type: SummaryType, title: string): Promise<SummaryRow> {
  return must(
    await db().from("summaries").insert({ user_id: userId, document_id: documentId, type, title, content: "", status: "pending" }).select().single()
  ) as SummaryRow;
}

export async function getSummary(userId: string, id: string): Promise<SummaryRow | null> {
  return (must(await db().from("summaries").select("*").eq("id", id).eq("user_id", userId).maybeSingle()) as SummaryRow | null) ?? null;
}

export async function listSummariesForDocument(userId: string, documentId: string): Promise<SummaryRow[]> {
  return must(
    await db().from("summaries").select("id,title,type,status,progress,created_at,updated_at").eq("user_id", userId).eq("document_id", documentId).order("created_at", { ascending: false })
  ) as SummaryRow[];
}

export async function updateSummary(userId: string, id: string, patch: Partial<SummaryRow>) {
  must(await db().from("summaries").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId));
}

/** Avoid starting the same summary twice (e.g. double click). */
export async function findActiveSummary(userId: string, documentId: string, type: SummaryType): Promise<SummaryRow | null> {
  const rows = must(
    await db().from("summaries").select("*").eq("user_id", userId).eq("document_id", documentId).eq("type", type).in("status", ["pending", "generating"])
  ) as SummaryRow[];
  return rows.find((r) => !isSummaryStale(r)) ?? null;
}

export function isSummaryStale(s: { status: string; updated_at: string }) {
  return IN_PROGRESS.includes(s.status) && Date.now() - new Date(s.updated_at).getTime() > LIMITS.stuckAfterSeconds * 1000;
}

export async function removeSummary(userId: string, id: string): Promise<boolean> {
  const rows = must(await db().from("summaries").delete().eq("id", id).eq("user_id", userId).select("id")) as { id: string }[];
  return rows.length > 0;
}

/** Rename / save from the UI. Returns false when the summary does not exist (or belongs to someone else). */
export async function patchSummary(userId: string, id: string, patch: { title?: string; saved?: boolean }): Promise<boolean> {
  const rows = must(
    await db().from("summaries").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).select("id")
  ) as { id: string }[];
  return rows.length > 0;
}

export type SavedSummaryListItem = {
  id: string;
  document_id: string;
  title: string;
  type: SummaryType;
  created_at: string;
  document_name: string | null;
};

export async function listSavedSummaries(userId: string): Promise<SavedSummaryListItem[]> {
  const rows = must(
    await db()
      .from("summaries")
      .select("id,document_id,title,type,created_at,documents(name)")
      .eq("user_id", userId)
      .eq("saved", true)
      .eq("status", "done")
      .order("created_at", { ascending: false })
  ) as unknown as (Omit<SavedSummaryListItem, "document_name"> & { documents: { name: string } | { name: string }[] | null })[];
  return rows.map(({ documents, ...r }) => ({ ...r, document_name: (Array.isArray(documents) ? documents[0] : documents)?.name ?? null }));
}

export async function countActiveSummaries(userId: string): Promise<number> {
  const rows = must(
    await db().from("summaries").select("id,status,updated_at").eq("user_id", userId).in("status", ["pending", "generating"])
  ) as { id: string; status: string; updated_at: string }[];
  return rows.filter((r) => !isSummaryStale(r)).length;
}
