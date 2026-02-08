-- Add DELETE policy for bookings table
-- This allows tutors and students to delete their own bookings
-- Safe to run multiple times - will drop and recreate if it exists

drop policy if exists "Tutor or student can delete own bookings" on public.bookings;

create policy "Tutor or student can delete own bookings"
  on public.bookings for delete
  using (auth.uid() = tutor_id or auth.uid() = student_id);
