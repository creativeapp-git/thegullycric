-- ============================================
-- GullyCric — Fresh Start: Wipe match data
-- Run this in the Supabase SQL Editor
-- ============================================

-- Order matters: child tables first (foreign key constraints)
DELETE FROM notification_log;
DELETE FROM match_followers;
DELETE FROM match_players;
DELETE FROM balls;
DELETE FROM matches;

-- Verify everything is clean
SELECT 'matches' AS tbl, COUNT(*) FROM matches
UNION ALL SELECT 'balls', COUNT(*) FROM balls
UNION ALL SELECT 'match_players', COUNT(*) FROM match_players
UNION ALL SELECT 'match_followers', COUNT(*) FROM match_followers
UNION ALL SELECT 'notification_log', COUNT(*) FROM notification_log;
