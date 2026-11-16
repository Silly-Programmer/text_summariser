import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { UUID_RE } from "@/lib/errors";
import { getSummary, isSummaryStale } from "@/lib/db/summaries";
import { PageHeader } from "@/components/page-header";
import { SummaryView } from "@/components/summary-view";
import { ItemActions } from "@/components/item-actions";

export const dynamic = "force-dynamic";

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const userId = await requireUserId();
  const s = await getSummary(userId, id);
  if (!s) notFound();

  return (
    <>
      <Link href={`/documents/${s.document_id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to document
      </Link>
      <PageHeader title={s.title} />
      {s.status === "done" && (
        <div className="mb-6"><ItemActions kind="summaries" id={s.id} title={s.title} saved={s.saved} redirectAfterDelete={`/documents/${s.document_id}`} /></div>
      )}
      <SummaryView
        documentId={s.document_id}
        initial={{ id: s.id, status: s.status, progress: s.progress, error: s.error, content: s.content, stale: isSummaryStale(s) }}
      />
    </>
  );
}
