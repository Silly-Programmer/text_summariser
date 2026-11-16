"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/progress-bar";
import { IN_PROGRESS } from "@/lib/format";

export type DocState = {
  id: string;
  status: string;
  progress: number;
  status_detail: string | null;
  error: string | null;
  stale: boolean;
};

/** Shows live progress while a PDF is being processed; offers Retry if it fails or gets stuck. */
export function ProcessingStatus({ initial }: { initial: DocState }) {
  const router = useRouter();
  const [doc, setDoc] = useState(initial);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const active = IN_PROGRESS.includes(doc.status);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/documents/${doc.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const next = await res.json();
        setDoc(next);
        if (next.status === "ready") router.refresh();
      } catch {}
    }, 2000);
    return () => clearInterval(timer);
  }, [active, doc.id, router]);

  async function retry() {
    setRetrying(true);
    setRetryError(null);
    const res = await fetch(`/api/documents/${doc.id}/retry`, { method: "POST" });
    setRetrying(false);
    if (!res.ok) return setRetryError((await res.json().catch(() => null))?.error ?? "Could not restart. Try again.");
    setDoc({ ...doc, status: "extracting", progress: 0, status_detail: "Restarting", error: null, stale: false });
  }

  if (doc.status === "failed") {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">We couldn&apos;t process this PDF</p>
              <p className="mt-1 text-sm text-muted-foreground">{doc.error ?? "Something went wrong."}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={retry} disabled={retrying}>Try again</Button>
            {retryError && <span className="text-sm text-destructive">{retryError}</span>}
          </div>
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
            <p className="font-medium">Processing your PDF…</p>
            <p className="text-sm text-muted-foreground">{doc.status_detail ?? "Starting"}</p>
          </div>
          <span className="ml-auto text-sm font-medium">{doc.progress}%</span>
        </div>
        <ProgressBar value={doc.progress} />
        <p className="text-xs text-muted-foreground">Scanned pages take longer because they are read with OCR. You can leave this page; it keeps running.</p>
        {doc.stale && (
          <div className="flex flex-wrap items-center gap-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            This seems to be stuck (the server may have restarted).
            <Button size="sm" variant="outline" onClick={retry} disabled={retrying}>Restart processing</Button>
            {retryError && <span className="text-destructive">{retryError}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
