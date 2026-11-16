import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";

// Test endpoint for Phase 1: proves server-side auth works on API routes.
export async function GET() {
  try {
    const userId = await requireUserId();
    return NextResponse.json({ userId, supabaseConfigured: isSupabaseConfigured() });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
