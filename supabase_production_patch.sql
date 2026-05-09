-- =============================================
-- GULLYCRIC PRODUCTION PATCH
-- Run this once in the Supabase SQL Editor before deploying the current app.
-- It aligns the schema with the scorer, public match page, and scorecard views.
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Match runtime columns used by scoring flows.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS out_players text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target integer,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

UPDATE public.matches SET out_players = '{}' WHERE out_players IS NULL;
UPDATE public.matches SET version = 1 WHERE version IS NULL;

-- The app uses intermediate states to ask for the next batter/bowler without
-- losing match context. Your pasted schema only allowed the four final states.
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_match_state_check;
ALTER TABLE public.matches ADD CONSTRAINT matches_match_state_check CHECK (
  match_state = ANY (
    ARRAY[
      'setup'::text,
      'live'::text,
      'paused'::text,
      'wicket_fall'::text,
      'over_break'::text,
      'innings_break'::text,
      'super_over_setup'::text,
      'super_over_break'::text,
      'completed'::text
    ]
  )
);

-- Prevent double-taps/retries from inserting the same delivery twice.
DELETE FROM public.balls a USING (
  SELECT MIN(ctid) AS ctid, match_id, innings, over, ball
  FROM public.balls
  GROUP BY match_id, innings, over, ball
  HAVING COUNT(*) > 1
) b
WHERE a.match_id = b.match_id
  AND a.innings = b.innings
  AND a.over = b.over
  AND a.ball = b.ball
  AND a.ctid <> b.ctid;

ALTER TABLE public.balls DROP CONSTRAINT IF EXISTS unique_ball_per_over;
ALTER TABLE public.balls ADD CONSTRAINT unique_ball_per_over
  UNIQUE (match_id, innings, over, ball);

-- Some earlier builds created a balls trigger that called an Edge Function or
-- webhook without a configured URL. That aborts scoring with:
--   P0001: url argument is missing
-- The client already handles score updates and in-app notifications, so disable
-- user-defined balls triggers unless you intentionally re-create a configured
-- server-side notification trigger later.
ALTER TABLE public.balls DISABLE TRIGGER USER;

-- Match followers are keyed by the short public match_id in the current app.
ALTER TABLE public.match_followers DROP CONSTRAINT IF EXISTS unique_match_follower;
ALTER TABLE public.match_followers ADD CONSTRAINT unique_match_follower
  UNIQUE (user_id, match_id);

-- Notification log should deduplicate edge-function sends per condition.
ALTER TABLE public.notification_log
  ALTER COLUMN match_id TYPE text USING match_id::text,
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS unique_notification_per_over;
ALTER TABLE public.notification_log ADD CONSTRAINT unique_notification_per_over
  UNIQUE (match_id, innings, over, condition);

-- RLS policies for host scoring. These are safe to re-run and allow the match
-- creator to insert/delete balls and maintain per-match player stats.
DROP POLICY IF EXISTS "Match creators can insert balls" ON public.balls;
CREATE POLICY "Match creators can insert balls"
ON public.balls
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id = balls.match_id
      AND matches.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Match creators can delete balls" ON public.balls;
CREATE POLICY "Match creators can delete balls"
ON public.balls
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id = balls.match_id
      AND matches.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Match creators can maintain match players" ON public.match_players;
CREATE POLICY "Match creators can maintain match players"
ON public.match_players
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id = match_players.match_id
      AND matches.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id = match_players.match_id
      AND matches.created_by = auth.uid()
  )
);

-- Scorecard RPC used by MatchDetailScreen.
CREATE OR REPLACE FUNCTION public.get_innings_stats(
  p_match_id uuid,
  p_innings integer
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH innings_balls AS (
    SELECT *
    FROM public.balls
    WHERE match_id = p_match_id
      AND innings = p_innings
  ),
  batting AS (
    SELECT
      batter AS name,
      COALESCE(SUM(
        CASE
          WHEN extra_type IN ('bye', 'legbye') OR is_legal = false THEN 0
          ELSE runs
        END
      ), 0)::integer AS runs,
      COALESCE(COUNT(*) FILTER (WHERE is_legal IS DISTINCT FROM false), 0)::integer AS balls,
      COALESCE(COUNT(*) FILTER (WHERE runs = 0 AND extra_type IS NULL AND is_legal IS DISTINCT FROM false), 0)::integer AS dots,
      COALESCE(COUNT(*) FILTER (WHERE runs = 1 AND extra_type IS NULL), 0)::integer AS ones,
      COALESCE(COUNT(*) FILTER (WHERE runs = 2 AND extra_type IS NULL), 0)::integer AS twos,
      COALESCE(COUNT(*) FILTER (WHERE runs = 3 AND extra_type IS NULL), 0)::integer AS threes,
      COALESCE(COUNT(*) FILTER (WHERE runs = 4 AND extra_type IS NULL), 0)::integer AS fours,
      COALESCE(COUNT(*) FILTER (WHERE runs = 6 AND extra_type IS NULL), 0)::integer AS sixes,
      BOOL_OR(is_wicket AND dismissed_player = batter) AS is_out,
      MAX(
        CASE
          WHEN is_wicket AND dismissed_player = batter THEN 
            CASE 
              WHEN wicket_type = 'caught' THEN 'c ' || COALESCE(fielder, 'sub') || ' b ' || bowler
              WHEN wicket_type = 'bowled' THEN 'b ' || bowler
              WHEN wicket_type = 'runout' THEN 'run out (' || COALESCE(fielder, 'fielder') || ')'
              WHEN wicket_type = 'lbw' THEN 'lbw b ' || bowler
              WHEN wicket_type = 'stumped' THEN 'st ' || COALESCE(fielder, 'wk') || ' b ' || bowler
              ELSE COALESCE(wicket_type, 'out')
            END
          ELSE NULL
        END
      ) AS dismissal
    FROM innings_balls
    WHERE batter IS NOT NULL
    GROUP BY batter
  ),
  bowling AS (
    SELECT
      bowler AS name,
      COALESCE(COUNT(*) FILTER (WHERE is_legal IS DISTINCT FROM false), 0)::integer AS legal_balls,
      COALESCE(SUM(
        CASE
          WHEN extra_type IN ('bye', 'legbye') THEN 0
          ELSE runs + extras
        END
      ), 0)::integer AS runs,
      COALESCE(COUNT(*) FILTER (WHERE is_wicket AND wicket_type <> 'runout'), 0)::integer AS wickets,
      COALESCE(COUNT(*) FILTER (WHERE runs = 0 AND extras = 0), 0)::integer AS dots
    FROM innings_balls
    WHERE bowler IS NOT NULL
    GROUP BY bowler
  ),
  summary AS (
    SELECT
      COALESCE(SUM(runs + extras), 0)::integer AS total_runs,
      COALESCE(COUNT(*) FILTER (WHERE is_wicket), 0)::integer AS total_wickets,
      COALESCE(COUNT(*) FILTER (WHERE is_legal IS DISTINCT FROM false), 0)::integer AS total_legal_balls,
      jsonb_build_object(
        'wides', COALESCE(SUM(extras) FILTER (WHERE extra_type = 'wide'), 0),
        'no_balls', COALESCE(SUM(extras) FILTER (WHERE extra_type = 'noball'), 0),
        'byes', COALESCE(SUM(extras) FILTER (WHERE extra_type = 'bye'), 0),
        'leg_byes', COALESCE(SUM(extras) FILTER (WHERE extra_type = 'legbye'), 0)
      ) AS extras
    FROM innings_balls
  )
  SELECT jsonb_build_object(
    'batting', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', name,
            'runs', runs,
            'balls', balls,
            'dots', dots,
            'ones', ones,
            'twos', twos,
            'threes', threes,
            'fours', fours,
            'sixes', sixes,
            'is_out', COALESCE(is_out, false),
            'dismissal', dismissal,
            'strike_rate', CASE WHEN balls > 0 THEN ROUND((runs::numeric / balls::numeric) * 100, 1)::text ELSE '0.0' END
          )
          ORDER BY runs DESC, balls ASC
        )
        FROM batting
      ),
      '[]'::jsonb
    ),
    'bowling', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', name,
            'legalBalls', legal_balls,
            'dots', dots,
            'runs', runs,
            'wickets', wickets,
            'economy', CASE WHEN legal_balls > 0 THEN ROUND((runs::numeric / legal_balls::numeric) * 6, 2)::text ELSE '0.00' END
          )
          ORDER BY legal_balls DESC, wickets DESC
        )
        FROM bowling
      ),
      '[]'::jsonb
    ),
    'summary', (SELECT to_jsonb(summary) FROM summary)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;
