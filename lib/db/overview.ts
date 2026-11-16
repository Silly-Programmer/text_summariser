import "server-only";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase/server";

export type RecentDocument = {
  id: string;
  name: string;
  page_count: number | null;
  status: string;
  created_at: string;
};

export type Overview = {
  ok: boolean;
  error?: string;
  documents: number;
  summaries: number;
  quizzes: number;
  recent: RecentDocument[];
};

export async function getOverview(userId: string): Promise<Overview> {
  const empty = { documents: 0, summaries: 0, quizzes: 0, recent: [] };
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase keys are missing in .env.local", ...empty };
  }
  try {
    const db = supabaseAdmin();
    const countSaved = (table: string) =>
      db.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId).eq("saved", true);

    // The document count and the 5 recent documents come back from ONE request (count: "exact" ignores the limit).
    const [recent, sums, quizzes] = await Promise.all([
      db
        .from("documents")
        .select("id,name,page_count,status,created_at", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      countSaved("summaries"),
      countSaved("quizzes"),
    ]);

    const failed = [recent, sums, quizzes].find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);

    return {
      ok: true,
      documents: recent.count ?? 0,
      summaries: sums.count ?? 0,
      quizzes: quizzes.count ?? 0,
      recent: (recent.data ?? []) as unknown as RecentDocument[],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    return { ok: false, error: `${msg}. Did you run supabase/schema.sql?`, ...empty };
  }
}
