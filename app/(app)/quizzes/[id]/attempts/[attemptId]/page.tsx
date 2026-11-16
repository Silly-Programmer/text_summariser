import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { UUID_RE } from "@/lib/errors";
import { getAttempt, getQuiz } from "@/lib/db/quizzes";
import { formatDateTime, percent } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { QuizReview } from "@/components/quiz-review";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function message(p: number) {
  if (p >= 90) return "Excellent work!";
  if (p >= 70) return "Well done. You know this material.";
  if (p >= 50) return "Good start. Review the missed questions below.";
  return "Keep going. Read the explanations below and try again.";
}

export default async function AttemptPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params;
  if (!UUID_RE.test(id) || !UUID_RE.test(attemptId)) notFound();
  const userId = await requireUserId();
  const [quiz, attempt] = await Promise.all([getQuiz(userId, id), getAttempt(userId, id, attemptId)]);
  if (!quiz || !attempt) notFound();

  const p = percent(attempt.score, attempt.total);
  // Pad/trim defensively so a stored attempt can never break the page.
  const answers = quiz.questions.map((_, i) => attempt.answers[i] ?? null);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/quizzes/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to quiz
      </Link>
      <PageHeader title="Your results" description={`${quiz.title} · ${formatDateTime(attempt.created_at)}`} />

      <Card className="mb-8">
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-4xl font-semibold leading-none">{attempt.score} <span className="text-2xl text-muted-foreground">/ {attempt.total}</span></p>
              <p className="mt-2 text-sm text-muted-foreground">{p}% correct · {message(p)}</p>
            </div>
            <Button asChild><Link href={`/quizzes/${id}/take`}><RotateCcw /> Try again</Link></Button>
          </div>
          <ProgressBar value={p} />
        </CardContent>
      </Card>

      <QuizReview questions={quiz.questions} answers={answers} />
    </div>
  );
}
