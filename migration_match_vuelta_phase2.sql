-- migration_match_vuelta_phase2.sql
-- Fase 2 calendario: etiqueta ida/vuelta/liguilla y permite reservar espejos sin jornada.
-- No hace backfill ni modifica partidos historicos existentes.

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS vuelta text;

ALTER TABLE public.matches
ALTER COLUMN vuelta TYPE text
USING vuelta::text;

ALTER TABLE public.matches
ALTER COLUMN jornada DROP NOT NULL;

ALTER TABLE public.matches
DROP CONSTRAINT IF EXISTS matches_vuelta_check;

ALTER TABLE public.matches
ADD CONSTRAINT matches_vuelta_check
CHECK (vuelta IS NULL OR vuelta IN ('ida', 'vuelta', 'liguilla'));

CREATE INDEX IF NOT EXISTS idx_matches_season_regular_pair_vuelta
ON public.matches (season_id, phase, home_team_id, away_team_id, vuelta);
