-- Host scoring RLS policies.
-- Run this if scoring/undo silently fails because Supabase RLS blocks writes.

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
