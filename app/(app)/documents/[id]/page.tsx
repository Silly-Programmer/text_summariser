import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { UUID_RE } from "@/lib/errors";
import { getDocument, isStale } from "@/lib/db/documents";
import { listSummariesForDocument } from "@/lib/db/summaries";
import { listQuizzesForDocument } from "@/lib/db/quizzes";
import { TYPE_LABEL } from "@/lib/summarize/prompts";
import { formatBytes, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ProcessingStatus } from "@/components/processing-status";
import { SummaryGenerator } from "@/components/summary-generator";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { Card } from "@/components/ui/card";
import { DeleteItemButton } from "@/components/delete-item-button";
import { QuizGenerator } from "@/components/quiz-generator";

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const userId = await requireUserId();
  const doc = await getDocument(userId, id);
  if (!doc) notFound();

  const [summaries, quizzes] =
    doc.status === "ready" ? await Promise.all([listSummariesForDocument(userId, id), listQuizzesForDocument(userId, id)]) : [[], []];

  return (
    <>
      <Link href="/documents" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> My documents
      </Link>
      <PageHeader
        title={doc.name}
        description={`${doc.page_count ? `${doc.page_count} pages · ` : ""}${formatBytes(doc.size_bytes)} · Uploaded ${formatDate(doc.created_at)}`}
        action={<DeleteDocumentButton id={doc.id} name={doc.name} redirectTo="/documents" />}
      />

      {doc.status !== "ready" ? (
        <ProcessingStatus
          initial={{ id: doc.id, status: doc.status, progress: doc.progress, status_detail: doc.status_detail, error: doc.error, stale: isStale(doc) }}
        />
      ) : (
        <>
          {doc.ocr_pages > 0 && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border bg-accent p-4 text-sm text-accent-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              {doc.ocr_pages} {doc.ocr_pages === 1 ? "page was a scanned image" : "pages were scanned images"} and read with OCR. Handwriting and blurry scans may contain small reading mistakes.
            </div>
          )}

          <h2 className="mb-3 text-lg font-semibold">Create notes</h2>
          <SummaryGenerator documentId={doc.id} />

          <h2 className="mb-3 mt-10 text-lg font-semibold">Your summaries</h2>
          {summaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet. Pick an option above to create your first notes.</p>
          ) : (
            <Card>
              <ul className="divide-y">
                {summaries.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 pr-2">
                    <Link href={`/summaries/${s.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-secondary">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{TYPE_LABEL[s.type]}</span>
                        <span className="text-muted-foreground">{formatDate(s.created_at)}</span>
                      </span>
                      <StatusBadge status={s.status} />
                    </Link>
                    <DeleteItemButton kind="summaries" id={s.id} title={`${TYPE_LABEL[s.type]} (${formatDate(s.created_at)})`} iconOnly />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <h2 className="mb-3 mt-10 text-lg font-semibold">Test yourself</h2>
          <QuizGenerator documentId={doc.id} />

          <h2 className="mb-3 mt-10 text-lg font-semibold">Your quizzes</h2>
          {quizzes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet. Choose the number of questions and a difficulty above to create your first quiz.</p>
          ) : (
            <Card>
              <ul className="divide-y">
                {quizzes.map((q) => (
                  <li key={q.id} className="flex items-center gap-2 pr-2">
                    <Link href={`/quizzes/${q.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-secondary">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{q.difficulty} quiz{q.status === "done" ? ` · ${q.question_count} questions` : ""}</span>
                        <span className="text-muted-foreground">{formatDate(q.created_at)}{q.saved ? " · Saved" : ""}</span>
                      </span>
                      <StatusBadge status={q.status} />
                    </Link>
                    <DeleteItemButton kind="quizzes" id={q.id} title={`${q.difficulty} quiz (${formatDate(q.created_at)})`} iconOnly />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}
