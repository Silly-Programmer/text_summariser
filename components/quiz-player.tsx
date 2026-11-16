"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicQuestion } from "@/lib/quiz/schema";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const LETTERS = ["A", "B", "C", "D"];

/** Exam-style screen: one question at a time. Answers are only graded on the server after you submit. */
export function QuizPlayer({ quizId, questions }: { quizId: string; questions: PublicQuestion[] }) {
  const router = useRouter();
  const total = questions.length;
  const storageKey = `quiz-progress-${quizId}`;
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(total).fill(null));
  const [index, setIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Keep answers if the page is refreshed by accident (browser storage may be unavailable: then we simply skip it).
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      if (saved && Array.isArray(saved.answers) && saved.answers.length === total) {
        setAnswers(saved.answers.map((a: unknown) => (typeof a === "number" && a >= 0 && a <= 3 ? a : null)));
        if (Number.isInteger(saved.index) && saved.index >= 0 && saved.index < total) setIndex(saved.index);
      }
    } catch {}
    setHydrated(true); // only start saving after we have tried to restore, or we would overwrite the saved answers
  }, [storageKey, total]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ answers, index }));
    } catch {}
  }, [hydrated, answers, index, storageKey]);

  const answered = useMemo(() => answers.filter((a) => a !== null).length, [answers]);
  const q = questions[index];
  const isLast = index === total - 1;

  const go = (i: number) => {
    setIndex(Math.max(0, Math.min(total - 1, i)));
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const choose = (opt: number) => setAnswers((prev) => prev.map((a, i) => (i === index ? opt : a)));
  const clear = () => setAnswers((prev) => prev.map((a, i) => (i === index ? null : a)));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not submit your answers. Please try again.");
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
      router.push(`/quizzes/${quizId}/attempts/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your answers. Please try again.");
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  function onSubmitClick() {
    if (answered < total) setConfirmOpen(true);
    else submit();
  }

  return (
    <div ref={topRef} className="scroll-mt-4">
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Question {index + 1} of {total}</span>
          <span className="text-muted-foreground">{answered} of {total} answered</span>
        </div>
        <ProgressBar value={(answered / total) * 100} />
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <fieldset>
            <legend className="mb-1 text-lg font-semibold leading-snug">{q.question}</legend>
            <div className="mt-4 grid gap-3" key={index}>
              {q.options.map((text, i) => {
                const selected = answers[index] === i;
                return (
                  <label
                    key={i}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring",
                      selected ? "border-primary bg-accent" : "bg-card hover:border-primary hover:bg-accent/50"
                    )}
                  >
                    <input
                      type="radio"
                      name={`q-${index}`}
                      checked={selected}
                      onChange={() => choose(i)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        selected ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {LETTERS[i]}
                    </span>
                    <span className="pt-0.5 leading-relaxed">{text}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {answers[index] !== null && (
            <button type="button" onClick={clear} className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:underline">
              Clear my answer
            </button>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => go(index - 1)} disabled={index === 0 || busy}>
          <ChevronLeft /> Previous
        </Button>
        {isLast ? (
          <Button onClick={onSubmitClick} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Submit quiz
          </Button>
        ) : (
          <Button onClick={() => go(index + 1)} disabled={busy}>
            Next <ChevronRight />
          </Button>
        )}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-8">
        <p className="mb-2 text-sm font-medium">Jump to a question</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Question ${i + 1}${answers[i] !== null ? ", answered" : ", not answered"}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "h-9 w-9 rounded-md border text-sm font-medium transition-colors",
                i === index && "ring-2 ring-ring ring-offset-2",
                answers[i] !== null ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
        {!isLast && (
          <div className="mt-4">
            <Button variant="outline" onClick={onSubmitClick} disabled={busy}>Submit quiz</Button>
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => !busy && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit with unanswered questions?</DialogTitle>
            <DialogDescription>
              You have not answered {total - answered} {total - answered === 1 ? "question" : "questions"}. They will count as wrong.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={busy}>Keep working</Button></DialogClose>
            <Button onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit anyway"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
