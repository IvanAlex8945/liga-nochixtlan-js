import { supabase } from '@/lib/supabase';
import PublicPageClient, { PlayerData, MatchData, PlayerStats } from './components/PublicPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchPublicData() {
  // ── Active seasons ──────────────────────────────────────────
  const { data: activeSeasonsRaw } = await supabase
    .from('seasons')
    .select('id, name, category, year, is_active')
    .eq('is_active', true)
    .order('year', { ascending: false });

  const seasons = activeSeasonsRaw ?? [];
  const activeSeasonIds = seasons.map(s => s.id);

  if (activeSeasonIds.length === 0) {
    return { seasons: [], teams: [], allPlayers: [], allMatches: [], allStats: [] };
  }

  // ── Teams ──────────
  const { data: teamsRaw } = await supabase
    .from('teams')
    .select('id, name, season_id, status, category')
    .in('season_id', activeSeasonIds)
    .limit(1000);

  const teamIds = (teamsRaw ?? []).map(t => t.id);

  // ── All Players ──
  let allPlayersRaw: Record<string, unknown>[] = [];
  if (teamIds.length > 0) {
    const { data } = await supabase
      .from('players')
      .select('id, name, team_id, number')
      .in('team_id', teamIds)
      .limit(5000);
    allPlayersRaw = data ?? [];
  }

  // ── All matches ───
  const { data: matchesRaw } = await supabase
    .from('matches')
    .select(`
      id, season_id, home_team_id, away_team_id,
      home_score, away_score, status,
      jornada, phase, scheduled_date, played_date, time_str, court,
      home_team:teams!matches_home_team_id_fkey(id, name),
      away_team:teams!matches_away_team_id_fkey(id, name)
    `)
    .in('season_id', activeSeasonIds)
    .order('jornada', { ascending: true })
    .limit(2000);

  // ── All stats ────
  const { data: statsRaw } = await supabase
    .from('player_match_stats')
    .select(`
      player_id, match_id, team_id, played, points, triples,
      players!inner(id, name),
      matches!inner(id, season_id, jornada, phase,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name))
    `)
    .eq('played', true)
    .in('matches.season_id', activeSeasonIds)
    .limit(10000);

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
      allPlayers={allPlayers as unknown as PlayerData[]}
      allMatches={allMatches as unknown as MatchData[]}
      allStats={allStats as unknown as PlayerStats[]}
    />
  );
}
