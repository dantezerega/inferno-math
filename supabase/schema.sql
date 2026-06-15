-- ============================================================================
-- Inferno — Supabase schema, RLS policies, triggers, and seed data.
-- Run this in the Supabase SQL editor (or `supabase db push`) once per project.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / idempotent guards.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles — one row per authenticated user (PK = auth.users.id)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  username    text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- user_stats — cumulative per-user statistics (PK = user_id)
-- ----------------------------------------------------------------------------
create table if not exists public.user_stats (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  level                   integer not null default 1,
  xp                      integer not null default 0,
  best_score              integer not null default 0,
  best_streak             integer not null default 0,
  current_streak          integer not null default 0,
  last_played_date        date,
  total_sessions          integer not null default 0,
  total_questions         integer not null default 0,
  total_correct           integer not null default 0,
  total_incorrect         integer not null default 0,
  total_practice_seconds  integer not null default 0,
  updated_at              timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- game_sessions — one row per completed game
-- ----------------------------------------------------------------------------
create table if not exists public.game_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  score       integer not null,
  accuracy    numeric(5, 2) not null default 0,
  duration    integer not null,
  difficulty  text not null,
  daily       boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists game_sessions_user_created_idx
  on public.game_sessions (user_id, created_at desc);

-- Supports global / time-bounded leaderboards by top score.
create index if not exists game_sessions_score_idx
  on public.game_sessions (score desc, created_at desc);

-- ----------------------------------------------------------------------------
-- achievements — catalog of all earnable achievements (public, read-only)
-- ----------------------------------------------------------------------------
create table if not exists public.achievements (
  id           text primary key,
  name         text not null,
  description  text not null
);

-- ----------------------------------------------------------------------------
-- user_achievements — which achievements a user has earned
-- ----------------------------------------------------------------------------
create table if not exists public.user_achievements (
  user_id         uuid not null references auth.users (id) on delete cascade,
  achievement_id  text not null references public.achievements (id) on delete cascade,
  earned_at       timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ----------------------------------------------------------------------------
-- daily_progress — per-user, per-day aggregate for streaks & heatmaps
-- ----------------------------------------------------------------------------
create table if not exists public.daily_progress (
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  score      integer not null default 0,
  questions  integer not null default 0,
  primary key (user_id, date)
);

create index if not exists daily_progress_user_date_idx
  on public.daily_progress (user_id, date);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles           enable row level security;
alter table public.user_stats         enable row level security;
alter table public.game_sessions      enable row level security;
alter table public.user_achievements  enable row level security;
alter table public.daily_progress     enable row level security;
alter table public.achievements       enable row level security;

-- Helper to (re)create a policy idempotently.
-- profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- user_stats ----------------------------------------------------------------
drop policy if exists "user_stats_select_own" on public.user_stats;
create policy "user_stats_select_own" on public.user_stats
  for select using (auth.uid() = user_id);

drop policy if exists "user_stats_insert_own" on public.user_stats;
create policy "user_stats_insert_own" on public.user_stats
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_stats_update_own" on public.user_stats;
create policy "user_stats_update_own" on public.user_stats
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- game_sessions -------------------------------------------------------------
drop policy if exists "game_sessions_select_own" on public.game_sessions;
create policy "game_sessions_select_own" on public.game_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "game_sessions_insert_own" on public.game_sessions;
create policy "game_sessions_insert_own" on public.game_sessions
  for insert with check (auth.uid() = user_id);

-- user_achievements ---------------------------------------------------------
drop policy if exists "user_achievements_select_own" on public.user_achievements;
create policy "user_achievements_select_own" on public.user_achievements
  for select using (auth.uid() = user_id);

drop policy if exists "user_achievements_insert_own" on public.user_achievements;
create policy "user_achievements_insert_own" on public.user_achievements
  for insert with check (auth.uid() = user_id);

-- daily_progress ------------------------------------------------------------
drop policy if exists "daily_progress_select_own" on public.daily_progress;
create policy "daily_progress_select_own" on public.daily_progress
  for select using (auth.uid() = user_id);

drop policy if exists "daily_progress_insert_own" on public.daily_progress;
create policy "daily_progress_insert_own" on public.daily_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "daily_progress_update_own" on public.daily_progress;
create policy "daily_progress_update_own" on public.daily_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- achievements catalog is readable by any authenticated user ----------------
drop policy if exists "achievements_select_all" on public.achievements;
create policy "achievements_select_all" on public.achievements
  for select using (auth.role() = 'authenticated');

-- ============================================================================
-- Triggers: auto-create profile + user_stats on signup
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Seed achievement catalog (keep in sync with src/game/achievements.ts)
-- ============================================================================
insert into public.achievements (id, name, description) values
  ('first_session',  'First Steps',     'Complete your first session.'),
  ('sessions_10',    'Warming Up',      'Complete 10 sessions.'),
  ('sessions_50',    'Dedicated',       'Complete 50 sessions.'),
  ('score_25',       'Quick Thinker',   'Score 25 in a single session.'),
  ('score_50',       'Sharp Mind',      'Score 50 in a single session.'),
  ('score_100',      'Calculator',      'Score 100 in a single session.'),
  ('streak_10',      'On Fire',         'Reach a 10-answer streak.'),
  ('streak_25',      'Inferno',         'Reach a 25-answer streak.'),
  ('daily_3',        'Habit Forming',   'Practice 3 days in a row.'),
  ('daily_7',        'Week Warrior',    'Practice 7 days in a row.'),
  ('questions_1000', 'Marathoner',      'Answer 1000 questions total.'),
  ('level_5',        'Ascending',       'Reach level 5.')
on conflict (id) do update
  set name = excluded.name, description = excluded.description;

-- ============================================================================
-- Leaderboard view (top score per user). Exposed read-only for future use.
-- Joins profiles for display name/avatar. RLS on game_sessions still applies
-- to direct queries; this view is intended to be queried via an RPC or made
-- security-definer when leaderboards go live.
-- ============================================================================
create or replace view public.leaderboard_global as
select
  gs.user_id,
  p.username,
  p.avatar_url,
  max(gs.score) as score
from public.game_sessions gs
left join public.profiles p on p.id = gs.user_id
group by gs.user_id, p.username, p.avatar_url
order by score desc;
