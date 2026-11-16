import Link from "next/link";
import { ListChecks } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { listSavedQuizzes } from "@/lib/db/quizzes";
import { formatDate, percent } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DeleteItemButton } from "@/components/delete-item-button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function Page() {
  const userId = await requireUserId();
  const quizzes = await listSavedQuizzes(userId);

  return (
    <>
      <PageHeader title="Saved quizzes" description="Quizzes you chose to keep, with your past attempts." />
      {quizzes.length === 0 ? (
        <EmptyState icon={ListChecks} title="No saved quizzes" description="Generate a quiz from a document, then save it to find it here." />
      ) : (
        <Card>
          <ul className="divide-y">
            {quizzes.map((q) => (
              <li key={q.id} className="flex items-center gap-2 pr-2">
                <Link href={`/quizzes/${q.id}`} className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary">
                  <ListChecks className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{q.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {q.question_count} questions · {q.difficulty}
                      {q.document_name ? ` · ${q.document_name}` : ""} · {formatDate(q.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    {q.best ? (
                      <>
                        <p className="font-medium">Best: {percent(q.best.score, q.best.total)}%</p>
                        <p className="text-muted-foreground">{q.attempts} {q.attempts === 1 ? "attempt" : "attempts"}</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Not attempted</p>
                    )}
                  </div>
                </Link>
                <DeleteItemButton kind="quizzes" id={q.id} title={q.title} iconOnly />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
