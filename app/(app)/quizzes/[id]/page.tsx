import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { UUID_RE } from "@/lib/errors";
import { getQuiz, isQuizStale, listAttempts } from "@/lib/db/quizzes";
import { formatDateTime, percent } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { QuizProgress } from "@/components/quiz-progress";
import { ItemActions } from "@/components/item-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const userId = await requireUserId();
  const quiz = await getQuiz(userId, id);
  if (!quiz) notFound();

  const ready = quiz.status === "done" && quiz.questions.length > 0;
  const attempts = ready ? await listAttempts(userId, id) : [];
  const best = attempts.reduce<number | null>((b, a) => Math.max(b ?? 0, percent(a.score, a.total)), null);

  return (
    <>
      <Link href={`/documents/${quiz.document_id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to document
      </Link>
      <PageHeader title={quiz.title} />

      {!ready ? (
        <QuizProgress
          documentId={quiz.document_id}
          initial={{ id: quiz.id, status: quiz.status === "done" ? "failed" : quiz.status, progress: quiz.progress, error: quiz.error, stale: isQuizStale(quiz) }}
        />
      ) : (
        <>
          <div className="mb-6"><ItemActions kind="quizzes" id={quiz.id} title={quiz.title} saved={quiz.saved} redirectAfterDelete="/quizzes" /></div>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div><dt className="text-muted-foreground">Questions</dt><dd className="text-lg font-semibold">{quiz.questions.length}</dd></div>
                <div><dt className="text-muted-foreground">Difficulty</dt><dd className="text-lg font-semibold">{quiz.difficulty}</dd></div>
                <div><dt className="text-muted-foreground">Attempts</dt><dd className="text-lg font-semibold">{attempts.length}</dd></div>
                {best !== null && <div><dt className="text-muted-foreground">Best score</dt><dd className="text-lg font-semibold">{best}%</dd></div>}
              </dl>
              <Button asChild size="lg">
                <Link href={`/quizzes/${quiz.id}/take`}><Play /> {attempts.length ? "Try again" : "Start quiz"}</Link>
              </Button>
            </CardContent>
          </Card>

          <h2 className="mb-3 mt-10 text-lg font-semibold">Attempt history</h2>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attempts yet. Start the quiz when you are ready.</p>
          ) : (
            <Card>
              <ul className="divide-y">
                {attempts.map((a) => (
                  <li key={a.id}>
                    <Link href={`/quizzes/${quiz.id}/attempts/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-secondary">
                      <span className="text-muted-foreground">{formatDateTime(a.created_at)}</span>
                      <span className="font-medium">{a.score} / {a.total} · {percent(a.score, a.total)}%</span>
                    </Link>
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
