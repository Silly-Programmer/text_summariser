"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** Always asks for confirmation before deleting. */
export function DeleteDocumentButton({ id, name, redirectTo, iconOnly }: { id: string; name: string; redirectTo?: string; iconOnly?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(false);
      return setError((await res.json().catch(() => null))?.error ?? "Could not delete. Please try again.");
    }
    setOpen(false);
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button variant="ghost" size="icon" aria-label={`Delete ${name}`}><Trash2 className="text-muted-foreground" /></Button>
        ) : (
          <Button variant="outline"><Trash2 /> Delete</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this document?</DialogTitle>
          <DialogDescription>
            “{name}” will be deleted along with its summaries and quizzes. This can&apos;t be undone.
          </DialogDescription>
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
