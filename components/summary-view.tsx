"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IN_PROGRESS } from "@/lib/format";

export type SummaryState = { id: string; status: string; progress: number; error: string | null; content: string; stale: boolean };

export function SummaryView({ initial, documentId }: { initial: SummaryState; documentId: string }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const active = IN_PROGRESS.includes(s.status);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/summaries/${s.id}`, { cache: "no-store" });
        if (res.ok) {
          const next = await res.json();
          setS(next);
          // Finished: reload server data so the Save / Delete buttons appear and cached pages are not stale.
          if (next.status === "done" || next.status === "failed") router.refresh();
        }
      } catch {}
    }, 2500);
    return () => clearInterval(timer);
  }, [active, s.id, router]);

  if (s.status === "failed" || (active && s.stale)) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">We couldn&apos;t finish this summary</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {s.error ?? "It stopped unexpectedly (the server may have restarted)."}
              </p>
            </div>
          </div>
          <div><Button asChild variant="outline"><Link href={`/documents/${documentId}`}>Back to document and try again</Link></Button></div>
        </CardContent>
      </Card>
    );
  }

  if (active) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
            <div>
              <p className="font-medium">Writing your notes…</p>
              <p className="text-sm text-muted-foreground">Long documents can take a few minutes. You can leave this page; it keeps running.</p>
            </div>
            <span className="ml-auto text-sm font-medium">{s.progress}%</span>
          </div>
          <ProgressBar value={s.progress} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-8"><Markdown>{s.content}</Markdown></CardContent>
    </Card>
  );
}
