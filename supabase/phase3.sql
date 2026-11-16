-- Phase 3: run once in Supabase SQL Editor (after schema.sql and phase2.sql). Safe to run twice.
-- Adds background-generation fields to quizzes (same idea as summaries in phase2.sql).

alter table quizzes alter column questions set default '[]'::jsonb;

alter table quizzes add column if not exists status text not null default 'done'
  check (status in ('pending','generating','done','failed'));
alter table quizzes add column if not exists progress int not null default 0;
alter table quizzes add column if not exists error text;
alter table quizzes add column if not exists question_count int not null default 0;
alter table quizzes add column if not exists updated_at timestamptz not null default now();

-- Attempt history lookups (per user, newest first)
create index if not exists attempts_user_idx on quiz_attempts (user_id, created_at desc);
