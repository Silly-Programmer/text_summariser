import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { BookOpenCheck, FileText, GraduationCap, ListChecks, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const { userId } = await auth();
  const signedIn = Boolean(userId);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </span>
          StudyBuddy
        </Link>
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild><Link href="/dashboard">Open dashboard</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost"><Link href="/sign-in">Log in</Link></Button>
              <Button asChild><Link href="/sign-up">Sign up</Link></Button>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-2 lg:pt-20">
        <div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Turn your PDF into notes you can actually study from.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Upload your lecture notes or a chapter. Get clear summaries with page references,
            then test yourself with a quiz made from the same material.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {signedIn ? (
              <Button asChild size="lg"><Link href="/dashboard">Continue to dashboard</Link></Button>
            ) : (
              <>
                <Button asChild size="lg"><Link href="/sign-up">Get started</Link></Button>
                <Button asChild size="lg" variant="outline"><Link href="/sign-in">Log in</Link></Button>
              </>
            )}
          </div>
        </div>

        {/* Example of the result */}
        <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5" aria-label="Example of generated notes and quiz">
          <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Operating Systems Notes.pdf</span>
            <span className="ml-auto text-muted-foreground">48 pages</span>
          </div>

          <div className="mt-4 rounded-md border p-4">
            <p className="text-sm font-semibold">Deadlock</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              A situation where processes wait on each other forever, so none of them can move ahead.
              It needs four conditions to happen together.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Source: page 31</p>
          </div>

          <div className="mt-3 rounded-md border p-4">
            <p className="text-sm font-semibold">Which is NOT a condition for deadlock?</p>
            <ul className="mt-3 space-y-2 text-sm">
              {["Mutual exclusion", "Hold and wait", "Preemption", "Circular wait"].map((o, i) => (
                <li
                  key={o}
                  className={
                    "rounded-md border px-3 py-2 " +
                    (i === 2 ? "border-primary bg-accent font-medium text-accent-foreground" : "text-muted-foreground")
                  }
                >
                  {o}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              ["Upload your PDF", "Typed or scanned PDFs. Scanned pages take a little longer to read."],
              ["Get your notes", "Pick a quick summary, detailed notes, chapter-wise notes, or important Q&A."],
              ["Take a quiz", "Choose how many questions and how hard. See your score and why each answer is right."],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What you get */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Built for exam prep</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {[
            [ScanText, "Works on scanned pages", "Photos of notes and scanned pages are read too, not just typed PDFs."],
            [BookOpenCheck, "Easy language, nothing skipped", "Hard topics are explained simply, and important definitions are highlighted."],
            [FileText, "Page references", "Every point links back to the page in your PDF, so you can check the source."],
            [ListChecks, "Real exam-style quizzes", "One question at a time, with a score, review, and explanations at the end."],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof FileText;
            return (
              <div key={title as string} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <I className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{title as string}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text as string}</p>
                </div>
              </div>
            );
          })}
        </div>
        {!signedIn && (
          <div className="mt-12">
            <Button asChild size="lg"><Link href="/sign-up">Sign up and upload your first PDF</Link></Button>
          </div>
        )}
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">StudyBuddy</footer>
    </div>
  );
}
