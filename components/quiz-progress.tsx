"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type QuizState = { id: string; status: string; progress: number; error: string | null; stale: boolean };

/** Shown while a quiz is being written (or when that failed). Refreshes the page when the quiz is ready. */
export function QuizProgress({ initial, documentId }: { initial: QuizState; documentId: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const active = q.status === "pending" || q.status === "generating";

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/quizzes/${q.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const next: QuizState = await res.json();
        setQ(next);
        if (next.status === "done") router.refresh();
      } catch {}
    }, 2500);
    return () => clearInterval(timer);
  }, [active, q.id, router]);

  if (q.status === "failed" || (active && q.stale)) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">We couldn&apos;t finish this quiz</p>
              <p className="mt-1 text-sm text-muted-foreground">{q.error ?? "It stopped unexpectedly (the server may have restarted)."}</p>
            </div>
          </div>
          <div><Button asChild variant="outline"><Link href={`/documents/${documentId}`}>Back to document and try again</Link></Button></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          <div>
            <p className="font-medium">Writing your questions…</p>
            <p className="text-sm text-muted-foreground">This can take a minute or two. You can leave this page; it keeps running.</p>
          </div>
          <span className="ml-auto text-sm font-medium">{q.progress}%</span>
        </div>
        <ProgressBar value={q.progress} />
      </CardContent>
    </Card>
  );
}
