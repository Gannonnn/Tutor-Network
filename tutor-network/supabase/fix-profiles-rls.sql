-- =============================================================================
-- Run this in Supabase SQL Editor to fix "row level security policy for
-- table profiles" when saving profile or adding subjects.
-- =============================================================================

-- Ensure RLS is enabled on profiles (no-op if already on)
alter table public.profiles enable row level security;

-- Drop existing policies we might have created (so this script is re-runnable)
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- Allow users to insert their own profile row (first-time from app)
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Allow users to update their own profile row (name, bio, avatar, etc.)
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
