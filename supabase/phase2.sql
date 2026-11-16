-- Phase 2: run once in Supabase SQL Editor (after schema.sql). Safe to run twice.
alter table documents add column if not exists status_detail text;
alter table documents add column if not exists ocr_pages int not null default 0;
alter table documents add column if not exists updated_at timestamptz not null default now();

alter table summaries add column if not exists status text not null default 'done'
  check (status in ('pending','generating','done','failed'));
alter table summaries add column if not exists progress int not null default 0;
alter table summaries add column if not exists error text;
alter table summaries add column if not exists updated_at timestamptz not null default now();
