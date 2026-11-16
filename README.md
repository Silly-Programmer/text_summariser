# StudyBuddy: AI Study Assistant

Upload a PDF (typed or scanned, even hundreds of pages), get easy notes with page references, then test yourself with a quiz.

**Status:** All three phases are built. Phases 1 and 2 are tested. Phase 3 (quizzes, save/rename, security audit) is built and its quiz logic is unit-tested, but it still needs your own end-to-end test with real keys (see "Testing Phase 3" below).

> This file explains the project, the setup and the decisions made so far. It does not contain the source code itself; get the project folder from the person who built it.

---

## Main user journey

Landing page → Sign up / Log in → Dashboard → Upload PDF → (automatic processing) → Generate summary → Generate quiz → Take quiz → Results and review → Save

---

## Tech stack (kept deliberately small)

| Area | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling / UI | Tailwind CSS v3 + shadcn/ui (button, card, dialog) |
| Auth | Clerk (`@clerk/nextjs` v7) |
| Database + file storage | Supabase (Postgres + private Storage bucket) |
| PDF text | `pdfjs-dist` |
| OCR | `tesseract.js` + `@napi-rs/canvas` (English data bundled via `@tesseract.js-data/eng`, no download at runtime) |
| AI | Google Gemini over plain REST, behind a swappable provider layer |
| Notes rendering | `react-markdown` + `remark-gfm` (raw HTML is not rendered) |

| Validation | `zod` (quiz JSON from the AI, and every request body in the quiz / rename routes) |

Not used on purpose: Prisma, local-file storage, a Supabase JS client in the browser.

---

## Setup

Requirements: Node.js 20.9 or newer.

```bash
npm install                     # Phase 3 adds one package: zod
cp .env.example .env.local      # Windows: copy .env.example .env.local
npm run dev                     # if turbopack gives trouble: npm run dev:webpack
```

Open http://localhost:3000

### Environment variables (`.env.local`)

```
# Clerk: dashboard.clerk.com -> API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Supabase: Project Settings -> API Keys. SERVER ONLY.
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...     # (legacy projects: the service_role key; SUPABASE_SERVICE_ROLE_KEY is also accepted)

# AI: aistudio.google.com -> Get API key
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash-lite    # check the exact name in AI Studio's model list
AI_CONCURRENCY=2                      # optional; lower it if you hit rate limits
```

Restart the dev server after changing `.env.local`.

### Database (run once in Supabase → SQL Editor)

1. `supabase/schema.sql`: tables, row-level security, private `pdfs` bucket
2. `supabase/phase2.sql`: extra columns for processing status and summaries
3. `supabase/phase3.sql`: extra columns so quizzes can be generated in the background

---

## Folder structure

```
app/
  page.tsx                      public landing page
  sign-in/, sign-up/            Clerk pages with a branded split layout
  (app)/                        everything behind login
    dashboard/, documents/, documents/[id]/, settings/
    summaries/, summaries/[id]/         saved list + one summary (save / rename / delete)
    quizzes/                            saved quizzes list
    quizzes/[id]/                       quiz overview, progress, attempt history
    quizzes/[id]/take/                  exam-style screen
    quizzes/[id]/attempts/[attemptId]/  score + review with explanations
  api/
    documents/ ...              upload, status polling, retry, delete, create summary
    documents/[id]/quizzes      create a quiz
    summaries/[id]/             poll + rename/save + delete
    quizzes/[id]/               poll + rename/save + delete
    quizzes/[id]/attempts       submit answers (graded on the server)
components/                     UI (ui/ = shadcn), upload button, progress, summary view, dialogs
lib/
  auth.ts                       requireUserId(): used by every page and API route
  supabase/server.ts            server-only Supabase client
  db/                           all queries; every one filters by user_id
  storage.ts                    file storage behind a tiny interface (swap to S3 here later)
  pdf/                          extract, ocr, clean, chunk, pipeline (DB-free), process (DB wrapper)
  ai/                           provider interface, Gemini adapter, retry, provider switch
  summarize/                    prompts, map-reduce builder, DB wrapper
  quiz/                         schema (Zod), prompts, build (DB-free), generate (DB wrapper), options
  db/quizzes.ts, db/jobs.ts     quiz + attempt queries; limit on simultaneous AI jobs
supabase/                       SQL files
middleware.ts                   route protection
```

---

## How PDF processing works

1. The file is uploaded through our server (max 50 MB, the Supabase free-tier file limit) and saved in the private `pdfs` bucket at `<clerk user id>/<document id>.pdf`.
2. A background job reads each page's text layer with pdfjs.
3. Pages with almost no text (under 40 characters) are treated as scanned and OCR'd with Tesseract. Typed pages are never OCR'd, which keeps it fast.
4. Text is cleaned (NUL bytes removed, hyphenated line breaks re-joined, whitespace normalised).
5. Text is split into chunks of about 24,000 characters on page boundaries. Each page is tagged `[[Page N]]` so the AI can cite pages.
6. Status and progress are written to the database; the UI polls and shows a live progress bar. If a job fails or gets stuck, the user sees a "Try again" button.

Handled gracefully: password-protected, corrupted, fake-extension and oversized PDFs, PDFs with no readable text.

## How summaries work (map-reduce)

Large documents are never sent to the AI in one request.

- **Detailed notes / Chapter-wise / Q&A:** one AI call per chunk, results kept in order and joined, so nothing is lost in a merge.
- **Quick summary:** key points per chunk, then merged in rounds until one final summary remains.
- Requests run with limited concurrency and automatic retry/backoff for rate limits (HTTP 429).
- Progress is stored and shown; summaries can be deleted (with a confirmation dialog).

The AI layer is one small interface (`generateText`). To switch provider, add one adapter file and one `case` in `lib/ai/index.ts`.

---

## How quizzes work

1. **Plan.** The requested number of questions is spread over the whole document: fewer questions than chunks means one question from chunks spread evenly; more means every chunk contributes, longer chunks more. A chunk supplies at most 12 questions (about one per 2,000 characters), so a very short document may give fewer questions than requested.
2. **Generate.** One AI call per chunk, with limited concurrency. The AI answers with a JSON array; each question has 4 options, a correct letter, an explanation and the source page.
3. **Validate (Zod).** Each question is checked on its own: exactly 4 distinct options, a valid answer letter, sensible lengths. Bad items are dropped, not the whole batch. A source page outside the chunk's page range is removed, never guessed.
4. **Retry.** Bad JSON or too few valid questions triggers up to 3 tries per chunk (the AI is told which questions already exist). Truncated JSON keeps its complete items.
5. **Duplicate filtering.** Questions that match an existing one (same text, or 70% or more word overlap) are dropped. Shortfalls are topped up in up to 2 extra rounds.
6. **Shuffle.** Options are shuffled on the server so the correct answer is not always in the same place.
7. **Take it.** One question at a time with Previous / Next, a numbered jump bar, a progress bar and a confirmation if questions are unanswered. Answers survive an accidental refresh (kept in the browser tab only until you submit).
8. **Grade on the server.** The browser never receives correct answers while you take the quiz. Submitting sends your choices; the server scores them, stores the attempt and shows results.
9. **Review.** Score, percentage, every question with your answer, the correct answer, the explanation and the source page, with a "Missed only" filter. Each quiz keeps its attempt history.

## Save, rename, delete

Summaries and quizzes both have Save (adds it to "Saved summaries" / "Saved quizzes"), Rename (1-120 characters) and Delete (always with a confirmation dialog). Unsaved items stay visible on their document page.

## Security model

- Clerk middleware blocks every route except `/`, `/sign-in` and `/sign-up`.
- Auth is checked again on the server in the app layout and in every API route (`requireUserId()`), so calling an endpoint directly without logging in fails.
- Supabase is only called from the server with the secret key. Row-level security is on with **no policies**, so the public key can read nothing.
- Every database query filters by the Clerk user id; another user's document or summary returns "not found".
- Secrets live only in `.env.local` (git-ignored); nothing sensitive reaches the browser.
- Destructive actions (delete document / summary / quiz) always show a confirmation dialog.
- Quiz answers are never sent to the browser before submitting, and scoring happens on the server.
- Request bodies for quiz creation, attempts and rename/save are validated with Zod; every `:id` in a URL must be a valid UUID.
- A user can have at most 3 summaries/quizzes being generated at once, which protects the AI quota from double clicks and scripts.
- Basic security headers are set in `next.config.mjs` (no-sniff, no framing, referrer policy, permissions policy).
- Phase 3 audit: every API route and page calls `requireUserId()`; every database query filters by `user_id`; no client component imports server, database or environment code.

---

## Known limits and gotchas

- **Gemini free tier:** rate limits are strict and not fully published (check AI Studio), so big documents take a few minutes. Content sent on the free tier may be used by Google to improve its products; avoid confidential PDFs, or switch to a paid tier.
- **Model names change.** If you see "model not found", copy the current free Flash / Flash-Lite model name from AI Studio into `GEMINI_MODEL`.
- **OCR runs on your own CPU**, so long scanned PDFs are slow. Currently English only.
- **Background jobs run inside the Next.js server.** If the server restarts mid-job, the document shows "Restart processing". Fine for local use; a hosted deployment would need a proper job queue and signed-URL uploads (serverless hosts limit request size).
- Chapter-wise summary is section-by-section; the AI picks each section's title unless the PDF has clear chapter headings.

### Phase 3 notes

- **Quiz size is capped by the document.** Asking for 30 questions from a 3-page PDF returns fewer. The quiz page shows the real number.
- **Quizzes fewer than asked can happen** if the AI keeps returning invalid or repeated questions; you get the valid ones. If none are valid you see a clear error and can try again.
- **Every quiz generation uses AI calls** (roughly one per 24,000-character chunk with questions), counted against your Gemini free-tier limits.
- **Attempts are not rate-limited.** Fine for personal use; add a limit before opening the app to the public.

### Testing Phase 3

1. Run `supabase/phase3.sql` and `npm install`, restart `npm run dev`.
2. Open a ready document and create a 5-question Easy quiz. Watch the progress bar, then the overview page.
3. Take it: answer some, skip some, refresh the page (answers should stay), submit (the unanswered warning should appear).
4. Check the score and review, the "Missed only" filter, then "Try again" and the attempt history.
5. Save, rename and delete a quiz and a summary; check the Saved lists and the dashboard counts.
6. Open a quiz URL while logged in as a second user: it should show "not found".

### Problems we already hit (and fixes)

| Problem | Fix |
|---|---|
| Clerk shows "outdated version of Clerk" | `npm install @clerk/nextjs@latest` (needs Node 20.9+) |
| `require is not defined` from `tailwind.config.ts` | Use `import animate from "tailwindcss-animate"` instead of `require` |
| `createRouteMatcher` deprecation warning | Replaced by a plain path check in `middleware.ts` |
| Dashboard needed a refresh after login | `forceRedirectUrl="/dashboard"` on the sign-in/up components |
| `Invalid factory url ... must include trailing slash` on Windows | Build pdfjs asset URLs with `/` separators |

---

## Roadmap

**Phase 3 (built)**
- Quiz generator: choose number of questions and Easy / Medium / Hard; 4-option MCQs with correct answer, explanation and source page
- AI JSON validated on the server with Zod, with retry on bad output and duplicate filtering
- Exam-style quiz screen: one question at a time, navigation, progress, submit, score, review with explanations, retry; attempt history
- Save / rename / delete for summaries and quizzes, with confirmations
- Security audit of all routes, responsive pass

**Possible later:** flashcards, chat with a PDF, document search, study plans, PDF export, progress tracking, more quiz formats.
