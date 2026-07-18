-- OptoPractice database schema
-- Run this once in the Supabase SQL editor (or via psql against DATABASE_URL) to set up the project.

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ── Users ──────────────────────────────────────────────────────────────
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  email         text not null unique,
  password_hash text not null,
  role          text not null default 'student' check (role in ('student', 'admin')),
  is_premium    boolean not null default false,
  premium_since timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_users_email on users (email);

-- If `users` already existed from an earlier run of this file (before Phase 4),
-- these add the new columns without touching existing data.
alter table users add column if not exists is_premium boolean not null default false;
alter table users add column if not exists premium_since timestamptz;

-- ── Payments (Paystack) ──────────────────────────────────────────────
-- One row per checkout attempt. `reference` is the Paystack transaction reference —
-- unique so we never process the same successful payment twice.
create table if not exists payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users (id) on delete cascade,
  reference       text not null unique,
  amount_pesewas  integer not null,
  currency        text not null default 'GHS',
  status          text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  created_at      timestamptz not null default now(),
  verified_at     timestamptz
);

create index if not exists idx_payments_user on payments (user_id, created_at desc);

-- ── Simulation attempts ──────────────────────────────────────────────
-- Generic store for practice sessions across instruments (retinoscopy now,
-- ophthalmoscopy in Phase 6). `inputs`/`result` are JSON so the shape can evolve
-- without a migration every time the simulator UI changes.
create table if not exists simulation_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users (id) on delete cascade,
  instrument       text not null check (instrument in ('retinoscopy', 'ophthalmoscopy')),
  inputs           jsonb not null default '{}'::jsonb,
  result           jsonb not null default '{}'::jsonb,
  duration_seconds integer,
  created_at       timestamptz not null default now()
);

create index if not exists idx_simulation_attempts_user on simulation_attempts (user_id, created_at desc);
-- Speeds up future leaderboard/admin queries filtering on graded attempts by score.
create index if not exists idx_simulation_attempts_result_mode on simulation_attempts ((result->>'mode'));

-- ── updated_at trigger for users ────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
  before update on users
  for each row
  execute function set_updated_at();
