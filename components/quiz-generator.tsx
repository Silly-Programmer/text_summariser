"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DEFAULT_QUIZ_COUNT, QUIZ_COUNTS } from "@/lib/quiz/options";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LEVELS = [
  { value: "Easy", text: "Key definitions and facts" },
  { value: "Medium", text: "Understanding and application" },
  { value: "Hard", text: "Reasoning with close options" },
] as const;

export function QuizGenerator({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [count, setCount] = useState<number>(DEFAULT_QUIZ_COUNT);
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

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="grid gap-5">
        <div role="radiogroup" aria-labelledby="quiz-count-label">
          <p id="quiz-count-label" className="mb-2 text-sm font-medium">Number of questions</p>
          <div className="flex flex-wrap gap-2">
            {QUIZ_COUNTS.map((n) => (
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
          <p className="text-sm text-muted-foreground">Questions cover the whole document and show the page each answer comes from. Very short documents may give fewer questions.</p>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
