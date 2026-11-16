import Link from "next/link";
import { FileText } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { listDocuments } from "@/lib/db/documents";
import { formatBytes, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { UploadButton } from "@/components/upload-button";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const userId = await requireUserId();
  const docs = await listDocuments(userId);

  return (
    <>
      <PageHeader title="My documents" description="All the PDFs you have uploaded." action={<UploadButton />} />
      {docs.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" description="Upload a PDF to get started. Typed and scanned PDFs both work.">
          <UploadButton />
        </EmptyState>
      ) : (
        <Card>
          <ul className="divide-y">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-2 pr-2">
                <Link href={`/documents/${d.id}`} className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary">
                  <FileText className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {d.page_count ? `${d.page_count} pages · ` : ""}{formatBytes(d.size_bytes)} · {formatDate(d.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </Link>
                <DeleteDocumentButton id={d.id} name={d.name} iconOnly />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
