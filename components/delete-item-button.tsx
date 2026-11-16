"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type ItemKind = "summaries" | "quizzes";

const COPY: Record<ItemKind, { noun: string; extra: string }> = {
  summaries: { noun: "summary", extra: "Your PDF is not affected, and you can create new notes anytime." },
  quizzes: { noun: "quiz", extra: "Its attempt history is deleted too. Your PDF is not affected, and you can create a new quiz anytime." },
};

/** Always asks for confirmation before deleting a summary or a quiz. */
export function DeleteItemButton({
  kind,
  id,
  title,
  redirectTo,
  iconOnly,
}: {
  kind: ItemKind;
  id: string;
  title: string;
  redirectTo?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { noun, extra } = COPY[kind];

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/${kind}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not delete. Please try again.");
    } catch (e) {
      setBusy(false);
      return setError(e instanceof Error ? e.message : "Could not delete. Please try again.");
    }
    setOpen(false);
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button variant="ghost" size="icon" aria-label={`Delete ${title}`}><Trash2 className="text-muted-foreground" /></Button>
        ) : (
          <Button variant="outline"><Trash2 /> Delete</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this {noun}?</DialogTitle>
          <DialogDescription>“{title}” will be deleted. This can&apos;t be undone. {extra}</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" disabled={busy}>Cancel</Button></DialogClose>
          <Button variant="destructive" onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Delete"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
