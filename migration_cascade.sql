-- ============================================================
-- CASCADE DELETE – Liga Nochixtlán
-- Ejecutar en Supabase SQL Editor (Settings → SQL Editor)
-- ============================================================
-- PRECAUCIÓN: Guarda backup antes de ejecutar.
-- Estos cambios permiten que al borrar una temporada o equipo
-- se eliminen automáticamente todos los datos vinculados.
-- ============================================================

-- 1. players → teams (al borrar equipo, sus jugadores se eliminan)
ALTER TABLE players
  DROP CONSTRAINT IF EXISTS players_team_id_fkey;

ALTER TABLE players
  ADD CONSTRAINT players_team_id_fkey
  FOREIGN KEY (team_id)
  REFERENCES teams(id)
  ON DELETE CASCADE;

-- 2. matches → seasons (al borrar temporada, sus partidos se eliminan)
ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_season_id_fkey;

ALTER TABLE matches
  ADD CONSTRAINT matches_season_id_fkey
  FOREIGN KEY (season_id)
  REFERENCES seasons(id)
  ON DELETE CASCADE;

-- 3. teams → seasons (al borrar temporada, sus equipos se eliminan)
ALTER TABLE teams
  DROP CONSTRAINT IF EXISTS teams_season_id_fkey;

ALTER TABLE teams
  ADD CONSTRAINT teams_season_id_fkey
  FOREIGN KEY (season_id)
  REFERENCES seasons(id)
  ON DELETE CASCADE;

-- 4. player_match_stats → matches
ALTER TABLE player_match_stats
  DROP CONSTRAINT IF EXISTS player_match_stats_match_id_fkey;

ALTER TABLE player_match_stats
  ADD CONSTRAINT player_match_stats_match_id_fkey
  FOREIGN KEY (match_id)
  REFERENCES matches(id)
  ON DELETE CASCADE;

-- 5. player_match_stats → players
ALTER TABLE player_match_stats
  DROP CONSTRAINT IF EXISTS player_match_stats_player_id_fkey;

ALTER TABLE player_match_stats
  ADD CONSTRAINT player_match_stats_player_id_fkey
  FOREIGN KEY (player_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

-- 6. player_match_stats → teams
ALTER TABLE player_match_stats
  DROP CONSTRAINT IF EXISTS player_match_stats_team_id_fkey;

ALTER TABLE player_match_stats
  ADD CONSTRAINT player_match_stats_team_id_fkey
  FOREIGN KEY (team_id)
  REFERENCES teams(id)
  ON DELETE CASCADE;

-- Verificación: listar todas las FKs de las tablas afectadas
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('players','matches','teams','player_match_stats')
ORDER BY tc.table_name;
