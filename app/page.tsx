import { supabase } from '@/lib/supabase';
import PublicPageClient from './components/PublicPageClient';

async function fetchPublicData() {
  // ── All seasons ──────────────────────────────────────────
  const { data: allSeasons } = await supabase
    .from('seasons')
    .select('id, name, category, year, is_active')
    .order('year', { ascending: false });

  const seasons = allSeasons ?? [];

  // ── Teams (id + name only, no computed columns) ──────────
  const { data: teamsRaw } = await supabase
    .from('teams')
    .select('id, name, season_id, status, category');

  // ── All Players (for full team rosters even with 0 pts) ──
  const { data: allPlayersRaw } = await supabase
    .from('players')
    .select('id, name, team_id, number');

  // ── All matches (for client-side standings per season) ───
  const { data: matchesRaw } = await supabase
    .from('matches')
    .select(`
      id, season_id, home_team_id, away_team_id,
      home_score, away_score, status,
      jornada, phase, scheduled_date, played_date,
      home_team:teams!matches_home_team_id_fkey(id, name),
      away_team:teams!matches_away_team_id_fkey(id, name)
    `)
    .order('jornada', { ascending: true });

  // ── All stats (all seasons, for leaders + historical) ────
  const { data: statsRaw } = await supabase
    .from('player_match_stats')
    .select(`
      player_id, match_id, team_id, played, points, triples,
      players!inner(id, name),
      matches!inner(id, season_id, jornada, phase,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name))
    `)
    .eq('played', true);

  const allStats = statsRaw ?? [];



  return {
    seasons,
    teams: teamsRaw ?? [],
    allPlayers: allPlayersRaw ?? [],
    allMatches: (matchesRaw ?? []) as unknown[],
    allStats: allStats as unknown[],
  };
}

export default async function Home() {
  const { seasons, teams, allPlayers, allMatches, allStats } = await fetchPublicData();

  return (
    <PublicPageClient
      seasons={seasons}
      teams={teams}
      allPlayers={allPlayers as any[]}
      allMatches={allMatches as any[]}
      allStats={allStats as any[]}
    />
  );
}
