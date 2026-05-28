-- ══════════════════════════════════════════════════════════
-- A* Battle Plan — Supabase Schema
-- Run this entire file once in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════

-- 1. User profiles (extends auth.users)
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  is_admin boolean default false,
  tos_agreed_at timestamptz,
  created_at timestamptz default now()
);

-- 2. Main data store — one row per (user, profile)
create table if not exists public.user_data (
  user_id uuid references auth.users on delete cascade not null,
  profile text not null default 'me',
  scores jsonb default '[]',
  errors jsonb default '[]',
  checks jsonb default '{}',
  targets jsonb default '{}',
  rag jsonb not null default '{}',
  updated_at timestamptz default now(),
  primary key (user_id, profile)
);

-- Migration: add rag column if upgrading from older schema
alter table public.user_data add column if not exists rag jsonb not null default '{}';

-- ── Row Level Security ──────────────────────────────────────

alter table public.user_profiles enable row level security;
alter table public.user_data enable row level security;

-- user_profiles: own row
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- user_profiles: admins see all
create policy "Admins can view all profiles"
  on public.user_profiles for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- user_data: own rows
create policy "Users can manage own data"
  on public.user_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_data: admins read all
create policy "Admins can view all data"
  on public.user_data for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ── Auto-create profile on signup ──────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Make yourself admin ─────────────────────────────────────
-- After signing up, run this once (replace with your email):
-- UPDATE public.user_profiles SET is_admin = true WHERE email = 'your@email.com';
