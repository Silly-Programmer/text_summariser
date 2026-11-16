"use client";

import { useState } from "react";
import { Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/quiz/schema";
import { Card, CardContent } from "@/components/ui/card";

const LETTERS = ["A", "B", "C", "D"];

/** Every question with your answer, the right answer and the explanation. */
export function QuizReview({ questions, answers }: { questions: QuizQuestion[]; answers: (number | null)[] }) {
  const [onlyMissed, setOnlyMissed] = useState(false);
  const missed = questions.filter((q, i) => answers[i] !== q.correctAnswer).length;
  const items = questions.map((q, i) => ({ q, i })).filter(({ q, i }) => !onlyMissed || answers[i] !== q.correctAnswer);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Review your answers</h2>
        <div role="group" aria-label="Filter questions" className="flex rounded-md border bg-card p-0.5 text-sm">
          {[
            { label: "All", value: false },
            { label: `Missed (${missed})`, value: true },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={onlyMissed === o.value}
              onClick={() => setOnlyMissed(o.value)}
              className={cn("rounded px-3 py-1.5 font-medium transition-colors", onlyMissed === o.value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">You got every question right. Nothing to review.</p>
      ) : (
        <ol className="grid gap-4">
          {items.map(({ q, i }) => {
            const mine = answers[i];
            const correct = mine === q.correctAnswer;
            const Icon = correct ? Check : mine === null ? Minus : X;
            return (
              <li key={i}>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                          correct ? "bg-emerald-50 text-emerald-700" : mine === null ? "bg-secondary text-secondary-foreground" : "bg-red-50 text-red-700"
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        <span className="sr-only">{correct ? "Correct" : mine === null ? "Not answered" : "Wrong"}</span>
                      </span>
                      <p className="font-semibold leading-snug">{i + 1}. {q.question}</p>
                    </div>

                    <ul className="mt-4 grid gap-2">
                      {q.options.map((text, o) => {
                        const isRight = o === q.correctAnswer;
                        const isMine = o === mine;
                        return (
                          <li
                            key={o}
                            className={cn(
                              "flex items-start gap-3 rounded-md border p-3 text-sm",
                              isRight && "border-emerald-300 bg-emerald-50",
                              isMine && !isRight && "border-red-300 bg-red-50"
                            )}
                          >
                            <span className="font-semibold">{LETTERS[o]}.</span>
                            <span className="flex-1">{text}</span>
                            {isRight && <span className="shrink-0 text-xs font-medium text-emerald-700">Correct answer</span>}
                            {isMine && !isRight && <span className="shrink-0 text-xs font-medium text-red-700">Your answer</span>}
                          </li>
                        );
                      })}
                    </ul>
                    {mine === null && <p className="mt-2 text-sm text-muted-foreground">You did not answer this question.</p>}

                    <p className="mt-4 text-sm leading-relaxed"><span className="font-semibold">Why: </span>{q.explanation}</p>
                    {q.sourcePage && <p className="mt-1 text-xs text-muted-foreground">Source: page {q.sourcePage}</p>}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
