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
    const count = (table: string) =>
      db.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
    const countSaved = (table: string) => count(table).eq("saved", true);

    const [docs, sums, quizzes, recent] = await Promise.all([
      count("documents"),
      countSaved("summaries"),
      countSaved("quizzes"),
      db
        .from("documents")
        .select("id,name,page_count,status,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const failed = [docs, sums, quizzes, recent].find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);

    return {
      ok: true,
      documents: docs.count ?? 0,
      summaries: sums.count ?? 0,
      quizzes: quizzes.count ?? 0,
      recent: (recent.data ?? []) as unknown as RecentDocument[],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    return { ok: false, error: `${msg}. Did you run supabase/schema.sql?`, ...empty };
  }
}
