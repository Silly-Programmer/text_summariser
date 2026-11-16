"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { type: "quick", title: "Quick summary", text: "One page: overview, key points and important terms." },
  { type: "detailed", title: "Detailed notes", text: "Full study notes. Nothing important is left out." },
  { type: "chapter", title: "Chapter-wise summary", text: "Section by section, with key points for each topic." },
  { type: "qa", title: "Important Q&A", text: "Exam-style questions with answers." },
] as const;

export function SummaryGenerator({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(type: string) {
    setBusy(type);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/summaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not start. Please try again.");
      router.push(`/summaries/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start. Please try again.");
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <button
            key={o.type}
            disabled={busy !== null}
            onClick={() => start(o.type)}
            className={cn(
              "rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60",
              busy === o.type && "border-primary bg-accent"
            )}
          >
            <span className="flex items-center gap-2 font-semibold">
              {busy === o.type && <Loader2 className="h-4 w-4 animate-spin" />}
              {o.title}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">{o.text}</span>
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
