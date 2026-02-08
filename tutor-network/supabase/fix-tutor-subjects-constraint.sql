-- =============================================================================
-- Run this in Supabase SQL Editor to fix:
--   duplicate key value violates unique constraint "tutor_subjects_tutor_id_subject_slug_key"
-- This allows tutors to select multiple subtopics per subject (e.g. Math > Algebra
-- and Math > Geometry) instead of one row per subject.
-- =============================================================================

-- 1. Add subtopic_id if the table was created with the old schema (no subtopic_id)
alter table public.tutor_subjects add column if not exists subtopic_id text;

-- 2. Drop the OLD unique constraint (one row per tutor + subject only)
alter table public.tutor_subjects drop constraint if exists tutor_subjects_tutor_id_subject_slug_key;

-- 3. Backfill existing rows: set subtopic_id = subject_slug so each row is valid
update public.tutor_subjects set subtopic_id = subject_slug where subtopic_id is null;

-- 4. Enforce not null (required for the new constraint)
alter table public.tutor_subjects alter column subtopic_id set not null;

-- 5. Add the NEW unique constraint (one row per tutor + subject + subtopic)
alter table public.tutor_subjects drop constraint if exists tutor_subjects_tutor_id_subject_slug_subtopic_id_key;
alter table public.tutor_subjects add constraint tutor_subjects_tutor_id_subject_slug_subtopic_id_key
  unique (tutor_id, subject_slug, subtopic_id);
