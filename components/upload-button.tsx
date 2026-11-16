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

    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents");
    xhr.upload.onprogress = (e) => e.lengthComputable && setPercent(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: { id?: string; error?: string } = {};
      try { body = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status === 201 && body.id) return router.push(`/documents/${body.id}`);
      setPercent(null);
      setError(body.error ?? "Upload failed. Please try again.");
    };
    xhr.onerror = () => { setPercent(null); setError("Upload failed. Check your connection and try again."); };
    setPercent(0);
    xhr.send(form);
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
