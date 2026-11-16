import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { UUID_RE } from "@/lib/errors";
import { getQuiz, toPublicQuestions } from "@/lib/db/quizzes";
import { PageHeader } from "@/components/page-header";
import { QuizPlayer } from "@/components/quiz-player";

export const dynamic = "force-dynamic";

export default async function TakeQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const userId = await requireUserId();
  const quiz = await getQuiz(userId, id);
  if (!quiz) notFound();
  if (quiz.status !== "done" || !quiz.questions.length) redirect(`/quizzes/${id}`);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/quizzes/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Leave quiz
      </Link>
      <PageHeader title={quiz.title} description={`${quiz.difficulty} · ${quiz.questions.length} questions`} />
      {/* Only the questions and options are sent to the browser. Correct answers stay on the server until you submit. */}
      <QuizPlayer quizId={quiz.id} questions={toPublicQuestions(quiz.questions)} />
    </div>
  );
}
