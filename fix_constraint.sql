-- =============================================
-- FIX CREATOR TEAM CHECK CONSTRAINT
-- Run this in Supabase SQL Editor
-- =============================================

-- Safely remove the buggy constraint
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS creator_team_check;

-- Recreate it to properly check if the creator team matches either team1 or team2 dynamically, 
-- rather than expecting the literal strings 'team1' or 'team2'
ALTER TABLE public.matches ADD CONSTRAINT creator_team_check 
  CHECK (creator_team = team1 OR creator_team = team2);
