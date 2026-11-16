-- StudyBuddy: ALL database setup in one file. Supabase -> SQL Editor -> New query -> paste -> Run (once).

-- ===== schema.sql =====
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- user_id always holds the Clerk user id (e.g. "user_2abc...").
-- RLS is enabled with NO policies: the public anon key can read nothing.
-- Only our server (service role key) can access data, always filtered by user_id.

create extension if not exists "pgcrypto";

create table if not exists documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  name          text not null,
  storage_path  text not null,
  size_bytes    bigint not null default 0,
  page_count    int,
  status        text not null default 'uploaded'
                check (status in ('uploaded','extracting','ocr','chunking','ready','failed')),
  progress      int not null default 0,
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists documents_user_idx on documents (user_id, created_at desc);

-- Text chunks with page references (filled in Phase 2)
create table if not exists document_chunks (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references documents(id) on delete cascade,
  user_id       text not null,
  chunk_index   int not null,
  page_start    int not null,
  page_end      int not null,
  content       text not null,
  used_ocr      boolean not null default false
);
create index if not exists chunks_doc_idx on document_chunks (document_id, chunk_index);

create table if not exists summaries (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  document_id   uuid not null references documents(id) on delete cascade,
  title         text not null,
  type          text not null check (type in ('quick','detailed','chapter','qa')),
  content       text not null,
  saved         boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists summaries_user_idx on summaries (user_id, created_at desc);

create table if not exists quizzes (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  document_id   uuid not null references documents(id) on delete cascade,
  title         text not null,
  difficulty    text not null check (difficulty in ('Easy','Medium','Hard')),
  questions     jsonb not null,  -- validated array of {question, options[4], correctAnswer, explanation, difficulty, sourcePage}
  saved         boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists quizzes_user_idx on quizzes (user_id, created_at desc);

create table if not exists quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  quiz_id       uuid not null references quizzes(id) on delete cascade,
  answers       jsonb not null,  -- array of selected option index (or null)
  score         int not null,
  total         int not null,
  created_at    timestamptz not null default now()
);
create index if not exists attempts_quiz_idx on quiz_attempts (quiz_id, created_at desc);

alter table documents        enable row level security;
alter table document_chunks  enable row level security;
alter table summaries        enable row level security;
alter table quizzes          enable row level security;
alter table quiz_attempts    enable row level security;

-- Private bucket for PDFs (files stored as <user_id>/<document_id>.pdf)
insert into storage.buckets (id, name, public) values ('pdfs', 'pdfs', false)
on conflict (id) do nothing;

-- ===== phase2.sql =====
-- Phase 2: run once in Supabase SQL Editor (after schema.sql). Safe to run twice.
alter table documents add column if not exists status_detail text;
alter table documents add column if not exists ocr_pages int not null default 0;
alter table documents add column if not exists updated_at timestamptz not null default now();

alter table summaries add column if not exists status text not null default 'done'
  check (status in ('pending','generating','done','failed'));
alter table summaries add column if not exists progress int not null default 0;
alter table summaries add column if not exists error text;
alter table summaries add column if not exists updated_at timestamptz not null default now();

-- ===== phase3.sql =====
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

