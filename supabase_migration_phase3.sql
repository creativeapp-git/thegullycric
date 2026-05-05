-- =============================================
-- GULLYCRIC: FINAL PRODUCTION MIGRATION
-- Run this in Supabase SQL Editor
-- =============================================

-- ── 1. Ball Integrity ─────────────────────────────────────────────────────────
-- Remove duplicate balls before applying constraint
DELETE FROM public.balls a USING (
  SELECT MIN(ctid) as ctid, match_id, innings, over, ball
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

-- ── 2. Commentary Column ──────────────────────────────────────────────────────
ALTER TABLE public.balls ADD COLUMN IF NOT EXISTS commentary_text TEXT;

-- ── 3. Push Token Storage ─────────────────────────────────────────────────────
-- One token per user. UUID primary key = UPSERT-safe.
-- References public.users (not auth.users) to match app schema.
DROP TABLE IF EXISTS user_push_tokens;
CREATE TABLE user_push_tokens (
  user_id         UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at      TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- ── 4. Notification Log (DB-level dedup for Edge Function) ───────────────────
-- The UNIQUE constraint IS the deduplication lock.
-- INSERT succeeds  → first time this condition fired for this over → send notification.
-- INSERT fails (23505) → already sent → skip silently.
-- match_id is UUID (matches.id), NOT the short match_id string.
CREATE TABLE IF NOT EXISTS notification_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  innings    INT  NOT NULL,
  over       INT  NOT NULL,
  condition  TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  CONSTRAINT unique_notification_per_over
    UNIQUE (match_id, innings, over, condition)
);

-- ── 5. DB Alignment Check ─────────────────────────────────────────────────────
-- Ensure match_followers.match_id is UUID (same as balls.match_id).
-- Run this only if the column type needs to be corrected:
-- ALTER TABLE public.match_followers
--   ALTER COLUMN match_id TYPE UUID USING match_id::uuid;

-- ── Note ──────────────────────────────────────────────────────────────────────
-- Super Over scores are NOT stored as columns on matches.
-- All scoring for innings 3 & 4 is derived live from the balls table.
