"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIMITS } from "@/lib/config";
import { formatBytes } from "@/lib/format";

export function UploadButton({ variant = "default" }: { variant?: "default" | "outline" }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [percent, setPercent] = useState<number | null>(null); // null = idle
  const [error, setError] = useState<string | null>(null);
  const busy = percent !== null;

  function upload(file: File) {
    setError(null);
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return setError("Please choose a PDF file.");
    if (file.size === 0) return setError("This file is empty.");
    if (file.size > LIMITS.maxPdfBytes) return setError(`This file is ${formatBytes(file.size)}. The limit is ${formatBytes(LIMITS.maxPdfBytes)}.`);

    setPercent(0);
    start(file).catch((e: unknown) => {
      setPercent(null);
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    });
  }

  /**
   * 1) ask our server for a one-time upload URL, 2) upload the PDF straight to storage (with progress),
   * 3) tell our server to start processing. The PDF never passes through our server, because Vercel
   * rejects request bodies larger than 4.5 MB.
   */
  async function start(file: File) {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size }),
    });
    const created = (await res.json().catch(() => ({}))) as { id?: string; uploadUrl?: string; error?: string };
    if (!res.ok || !created.id || !created.uploadUrl) throw new Error(created.error ?? "Upload failed. Please try again.");

    try {
      await putFile(created.uploadUrl, file, (p) => setPercent(p));
      const started = await fetch(`/api/documents/${created.id}/start`, { method: "POST" });
      if (!started.ok) {
        const body = (await started.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not start processing. Please try again.");
      }
    } catch (e) {
      // don't leave a half-uploaded document in the list
      fetch(`/api/documents/${created.id}`, { method: "DELETE" }).catch(() => {});
      throw e;
    }
    router.push(`/documents/${created.id}`);
    router.refresh(); // clear cached lists so Dashboard / My documents show the new file
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload(f);
        }}
      />
      <Button variant={variant} disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}
        {busy ? (percent === 100 ? "Saving…" : `Uploading ${percent}%`) : "Upload PDF"}
      </Button>
      {error && <p role="alert" className="max-w-xs text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** Uploads to a Supabase signed upload URL. Uses XHR (not fetch) so we can show a percentage. */
function putFile(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", file); // Supabase expects the file under an empty field name
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = "Upload failed. Please try again.";
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        if (xhr.status === 413) msg = "This file is too large for storage. Try a smaller PDF.";
        else if (body.message || body.error) msg = `Upload failed: ${body.message ?? body.error}`;
      } catch {}
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(form);
  });
}
