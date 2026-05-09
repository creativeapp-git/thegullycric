-- Emergency scoring fix:
-- Run this in Supabase SQL Editor if scoring fails with:
--   P0001: url argument is missing
--
-- Cause: an older user-defined trigger on public.balls is calling a webhook or
-- Edge Function without a configured URL, so every ball insert is rolled back.
-- The app already updates scores after inserting a ball.

ALTER TABLE public.balls DISABLE TRIGGER USER;
