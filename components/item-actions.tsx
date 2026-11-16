"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DeleteItemButton, type ItemKind } from "@/components/delete-item-button";

async function patch(kind: ItemKind, id: string, body: { title?: string; saved?: boolean }) {
  const res = await fetch(`/api/${kind}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not save. Please try again.");
}

function SaveToggle({ kind, id, saved }: { kind: ItemKind; id: string; saved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await patch(kind, id, { saved: !saved });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
    }
    setBusy(false);
  }

  return (
    <>
      <Button variant={saved ? "secondary" : "default"} onClick={toggle} disabled={busy} aria-pressed={saved}>
        {busy ? <Loader2 className="animate-spin" /> : saved ? <BookmarkCheck /> : <Bookmark />}
        {saved ? "Saved" : "Save"}
      </Button>
      {error && <span role="alert" className="w-full text-sm text-destructive">{error}</span>}
    </>
  );
}

function RenameButton({ kind, id, title }: { kind: ItemKind; id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = value.trim();
    if (!name) return setError("Enter a name.");
    setBusy(true);
    setError(null);
    try {
      await patch(kind, id, { title: name });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename. Please try again.");
    }
    setBusy(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        setOpen(o);
        if (o) {
          setValue(title);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline"><Pencil /> Rename</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={save} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>Choose a name that is easy to find later.</DialogDescription>
          </DialogHeader>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={120}
            autoFocus
            aria-label="Name"
            className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={busy}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save name"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Save / Rename / Delete for a summary or a quiz. Delete always asks for confirmation. */
export function ItemActions({
  kind,
  id,
  title,
  saved,
  redirectAfterDelete,
}: {
  kind: ItemKind;
  id: string;
  title: string;
  saved: boolean;
  redirectAfterDelete: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SaveToggle kind={kind} id={id} saved={saved} />
      <RenameButton kind={kind} id={id} title={title} />
      <DeleteItemButton kind={kind} id={id} title={title} redirectTo={redirectAfterDelete} />
    </div>
  );
}
