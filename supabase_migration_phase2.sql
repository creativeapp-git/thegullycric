-- =============================================
-- PHASE 2: HARDENING MIGRATION
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Safely add all missing columns
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS striker TEXT,
ADD COLUMN IF NOT EXISTS "nonStriker" TEXT,
ADD COLUMN IF NOT EXISTS "currentBowler" TEXT,
ADD COLUMN IF NOT EXISTS "lastBowler" TEXT,
ADD COLUMN IF NOT EXISTS match_state TEXT DEFAULT 'setup',
ADD COLUMN IF NOT EXISTS out_players TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

-- 2. Clean up any existing NULLs
UPDATE public.matches SET match_state = 'setup' WHERE match_state IS NULL;
UPDATE public.matches SET version = 1 WHERE version IS NULL;

-- 3. Atomic scoring RPC — replaces add_ball + separate match update
CREATE OR REPLACE FUNCTION record_ball_and_update_match(
  p_match_id UUID,
  p_version INT,
  p_innings INT,
  p_over INT,
  p_ball_num INT,
  p_runs INT,
  p_extras INT,
  p_extra_type TEXT DEFAULT NULL,
  p_is_wicket BOOLEAN DEFAULT FALSE,
  p_wicket_type TEXT DEFAULT NULL,
  p_batter TEXT DEFAULT NULL,
  p_bowler TEXT DEFAULT NULL,
  p_dismissed_player TEXT DEFAULT NULL,
  p_next_striker TEXT DEFAULT NULL,
  p_next_non_striker TEXT DEFAULT NULL,
  p_next_bowler TEXT DEFAULT NULL,
  p_last_bowler TEXT DEFAULT NULL,
  p_next_match_state TEXT DEFAULT 'live',
  p_out_players TEXT[] DEFAULT '{}'
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_version INT;
  v_ball_id UUID;
  v_total_runs INT;
  v_total_wickets INT;
  v_legal_balls INT;
  v_score_str TEXT;
BEGIN
  -- Lock row + check version (optimistic concurrency)
  SELECT version INTO v_current_version
  FROM matches WHERE id = p_match_id FOR UPDATE;

  IF v_current_version IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'MATCH_NOT_FOUND');
  END IF;

  IF v_current_version != p_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VERSION_CONFLICT',
      'current_version', v_current_version
    );
  END IF;

  -- Insert ball record
  INSERT INTO balls (
    match_id, innings, "over", ball, runs, extras, extra_type,
    is_wicket, wicket_type, batter, bowler, dismissed_player
  ) VALUES (
    p_match_id, p_innings, p_over, p_ball_num, p_runs, p_extras, p_extra_type,
    p_is_wicket, p_wicket_type, p_batter, p_bowler, p_dismissed_player
  ) RETURNING id INTO v_ball_id;

  -- Compute updated score from all balls in this innings
  SELECT
    COALESCE(SUM(runs + extras), 0),
    COUNT(*) FILTER (WHERE is_wicket = true),
    COUNT(*) FILTER (WHERE extra_type IS NULL OR extra_type IN ('bye', 'legbye'))
  INTO v_total_runs, v_total_wickets, v_legal_balls
  FROM balls
  WHERE match_id = p_match_id AND innings = p_innings;

  v_score_str := v_total_runs || '/' || v_total_wickets
    || ' (' || (v_legal_balls / 6) || '.' || (v_legal_balls % 6) || ')';

  -- Atomic match update
  IF p_innings = 1 THEN
    UPDATE matches SET
      score1 = v_score_str,
      striker = p_next_striker,
      "nonStriker" = p_next_non_striker,
      "currentBowler" = p_next_bowler,
      "lastBowler" = p_last_bowler,
      match_state = p_next_match_state,
      out_players = p_out_players,
      version = p_version + 1
    WHERE id = p_match_id;
  ELSE
    UPDATE matches SET
      score2 = v_score_str,
      striker = p_next_striker,
      "nonStriker" = p_next_non_striker,
      "currentBowler" = p_next_bowler,
      "lastBowler" = p_last_bowler,
      match_state = p_next_match_state,
      out_players = p_out_players,
      version = p_version + 1
    WHERE id = p_match_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ball_id', v_ball_id,
    'new_version', p_version + 1,
    'score', v_score_str
  );
END;
$$;
