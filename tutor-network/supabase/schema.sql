-- =============================================================================
-- Tutor Network – DB schema for dashboard (profiles, availabilities, bookings)
-- Run this in Supabase SQL Editor. You already have profiles; run the ALTER
-- and then the new tables + RLS.
--
-- Dashboard expects:
--   - profiles.user_type = 'student' | 'tutor' (set at signup or on profile)
--   - profiles.contact_info (optional)
--   - availabilities (tutor_id, date, time_slots)
--   - bookings (availability_id, tutor_id, student_id, date, time, status)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend profiles (add columns if missing)
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists user_type text check (user_type in ('student', 'tutor')),
  add column if not exists contact_info text;

-- Optional: create index for filtering by user_type
create index if not exists profiles_user_type_idx on public.profiles (user_type);

-- -----------------------------------------------------------------------------
-- 2. Availabilities (tutor availability slots by date)
-- -----------------------------------------------------------------------------
create table if not exists public.availabilities (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  time_slots text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (tutor_id, date)
);

alter table public.availabilities enable row level security;

create policy "Anyone can view availabilities"
  on public.availabilities for select
  using (true);

create policy "Tutors can manage own availabilities"
  on public.availabilities for all
  using (auth.uid() = tutor_id)
  with check (auth.uid() = tutor_id);

-- -----------------------------------------------------------------------------
-- 3. Bookings (student bookings of tutor availability slots)
-- -----------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  availability_id uuid not null references public.availabilities (id) on delete cascade,
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  time text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  subject_slug text,
  subtopic_title text,
  created_at timestamptz not null default now()
);

-- Add subject/topic columns if table already existed
alter table public.bookings add column if not exists subject_slug text;
alter table public.bookings add column if not exists subtopic_title text;

-- -----------------------------------------------------------------------------
-- 3b. Tutor subjects (which subjects/topics a tutor teaches)
-- -----------------------------------------------------------------------------
create table if not exists public.tutor_subjects (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  subject_slug text not null,
  subtopic_id text not null,
  unique (tutor_id, subject_slug, subtopic_id)
);

-- If table already existed without subtopic_id, run:
-- alter table public.tutor_subjects add column if not exists subtopic_id text;
-- alter table public.tutor_subjects drop constraint if exists tutor_subjects_tutor_id_subject_slug_key;
-- alter table public.tutor_subjects add constraint tutor_subjects_tutor_id_subject_slug_subtopic_id_key unique (tutor_id, subject_slug, subtopic_id);
-- update public.tutor_subjects set subtopic_id = subject_slug where subtopic_id is null;
-- alter table public.tutor_subjects alter column subtopic_id set not null;

alter table public.tutor_subjects enable row level security;

create policy "Anyone can view tutor_subjects"
  on public.tutor_subjects for select
  using (true);

create policy "Tutors can manage own tutor_subjects"
  on public.tutor_subjects for all
  using (auth.uid() = tutor_id)
  with check (auth.uid() = tutor_id);

alter table public.bookings enable row level security;

create policy "Users can view own bookings (tutor or student)"
  on public.bookings for select
  using (auth.uid() = tutor_id or auth.uid() = student_id);

create policy "Students can create bookings"
  on public.bookings for insert
  with check (auth.uid() = student_id);

create policy "Tutor or student can update own bookings"
  on public.bookings for update
  using (auth.uid() = tutor_id or auth.uid() = student_id)
  with check (auth.uid() = tutor_id or auth.uid() = student_id);

-- -----------------------------------------------------------------------------
-- 4. Allow reading all profiles (for dashboard tutor/student lists)
-- -----------------------------------------------------------------------------
-- Dashboard needs to list tutors (for students) and students (for tutors).
-- If you already have a policy that allows this, skip the next line or drop it first.
create policy "profiles_select_all_for_lists"
  on public.profiles for select
  using (true);

-- -----------------------------------------------------------------------------
-- 5. (Optional) Sync user_type from signup into profiles
-- -----------------------------------------------------------------------------
-- If your handle_new_user trigger doesn't set user_type yet, replace it with:
--
-- create or replace function public.handle_new_user()
-- returns trigger language plpgsql security definer set search_path = ''
-- as $$
-- begin
--   insert into public.profiles (id, email, full_name, user_type)
--   values (
--     new.id,
--     new.email,
--     coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
--     new.raw_user_meta_data->>'user_type'
--   );
--   return new;
-- end;
-- $$;
--
-- For existing users, set user_type from auth metadata in your app or run:
-- update public.profiles p
-- set user_type = (select (raw_user_meta_data->>'user_type') from auth.users u where u.id = p.id)
-- where user_type is null;
