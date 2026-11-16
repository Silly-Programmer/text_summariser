"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { defaultQuizCount, quizCountOptions } from "@/lib/quiz/options";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LEVELS = [
  { value: "Easy", text: "Key definitions and facts" },
  { value: "Medium", text: "Understanding and application" },
  { value: "Hard", text: "Reasoning with close options" },
] as const;

export function QuizGenerator({ documentId, maxQuestions }: { documentId: string; maxQuestions: number }) {
  const router = useRouter();
  const options = quizCountOptions(maxQuestions);
  const [count, setCount] = useState<number>(defaultQuizCount(options));
  const [difficulty, setDifficulty] = useState<(typeof LEVELS)[number]["value"]>("Medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, difficulty }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not start. Please try again.");
      router.push(`/quizzes/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start. Please try again.");
      setBusy(false);
    }
  }

  const chip = (selected: boolean) =>
    cn(
      "rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
      selected ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:border-primary hover:bg-accent"
    );

  if (options.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-5 text-sm text-muted-foreground">
        This document is too short to make a quiz. Upload a longer PDF to test yourself.
      </div>
    );
  }

  const most = options[options.length - 1];

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="grid gap-5">
        <div role="radiogroup" aria-labelledby="quiz-count-label">
          <p id="quiz-count-label" className="mb-2 text-sm font-medium">Number of questions</p>
          <div className="flex flex-wrap gap-2">
            {options.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={count === n} disabled={busy} onClick={() => setCount(n)} className={chip(count === n)}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div role="radiogroup" aria-labelledby="quiz-level-label">
          <p id="quiz-level-label" className="mb-2 text-sm font-medium">Difficulty</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                role="radio"
                aria-checked={difficulty === l.value}
                disabled={busy}
                onClick={() => setDifficulty(l.value)}
                className={cn(chip(difficulty === l.value), "text-left")}
              >
                <span className="block font-semibold">{l.value}</span>
                <span className="block text-xs font-normal text-muted-foreground">{l.text}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={start} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Create quiz
          </Button>
          <p className="text-sm text-muted-foreground">{most < 30
              ? `This document has enough material for up to ${most} questions. Longer documents allow more.`
              : "Questions cover the whole document and show the page each answer comes from."}</p>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
