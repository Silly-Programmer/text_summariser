import Link from "next/link";
import { AlertTriangle, FileText, ListChecks, NotebookText } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getOverview } from "@/lib/db/overview";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { UploadButton } from "@/components/upload-button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const o = await getOverview(userId);

  const stats = [
    { label: "Documents", value: o.documents, icon: FileText },
    { label: "Saved summaries", value: o.summaries, icon: NotebookText },
    { label: "Saved quizzes", value: o.quizzes, icon: ListChecks },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Upload a PDF, get easy notes, then test yourself with a quiz."
        action={<UploadButton />}
      />

      {!o.ok && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">Database not connected</p>
            <p className="text-muted-foreground">{o.error}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold leading-none">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-3 mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent documents</h2>
        {o.recent.length > 0 && <Link href="/documents" className="text-sm font-medium text-primary hover:underline">View all</Link>}
      </div>
      {o.recent.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" description="Upload your first PDF to get started. Typed and scanned PDFs both work.">
          <UploadButton />
        </EmptyState>
      ) : (
        <Card>
          <ul className="divide-y">
            {o.recent.map((d) => (
              <li key={d.id}>
                <Link href={`/documents/${d.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-secondary">
                  <span className="truncate font-medium">{d.name}</span>
                  <span className="flex shrink-0 items-center gap-3 text-muted-foreground">
                    {d.page_count ? `${d.page_count} pages` : ""}
                    <StatusBadge status={d.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
