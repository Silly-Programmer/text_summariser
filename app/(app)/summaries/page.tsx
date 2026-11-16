import Link from "next/link";
import { NotebookText } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { listSavedSummaries } from "@/lib/db/summaries";
import { formatDate } from "@/lib/format";
import { TYPE_LABEL } from "@/lib/summarize/prompts";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DeleteItemButton } from "@/components/delete-item-button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function Page() {
  const userId = await requireUserId();
  const summaries = await listSavedSummaries(userId);

  return (
    <>
      <PageHeader title="Saved summaries" description="Notes you chose to keep." />
      {summaries.length === 0 ? (
        <EmptyState icon={NotebookText} title="No saved summaries" description="Generate a summary from a document, then save it to find it here." />
      ) : (
        <Card>
          <ul className="divide-y">
            {summaries.map((s) => (
              <li key={s.id} className="flex items-center gap-2 pr-2">
                <Link href={`/summaries/${s.id}`} className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary">
                  <NotebookText className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {TYPE_LABEL[s.type]}
                      {s.document_name ? ` · ${s.document_name}` : ""} · {formatDate(s.created_at)}
                    </p>
                  </div>
                </Link>
                <DeleteItemButton kind="summaries" id={s.id} title={s.title} iconOnly />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
