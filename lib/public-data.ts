import 'server-only';

import { unstable_cache } from 'next/cache';

import {
  getPublicSeasonTag,
  PUBLIC_SEASONS_TAG,
} from '@/lib/public-cache-keys';
import { supabase } from '@/lib/supabase';

export interface PublicSeason {
  id: number;
  name: string;
  category: string;
  year: number;
  is_active: boolean;
}

export interface PublicTeam {
  id: number;
  season_id?: number | null;
  name: string;
}

export interface PublicPlayer {
  id: number;
  team_id?: number;
  number?: string | null;
  name: string;
}

export interface PublicMatch {
  id: number;
  season_id?: number | null;
  jornada?: number | null;
  phase?: string | null;
  status?: string | null;
  home_team_id?: number;
  away_team_id?: number;
  home_score?: number | null;
  away_score?: number | null;
  home_team?: PublicTeam;
  away_team?: PublicTeam;
  vuelta?: 'ida' | 'vuelta' | 'liguilla' | null;
  scheduled_date?: string | null;
  played_date?: string | null;
  time_str?: string | null;
  court?: string | null;
}

export interface PublicPlayerStats {
  match_id: number;
  team_id: number;
  played: boolean;
  points?: number | null;
  triples?: number | null;
  players?: PublicPlayer | null;
}

export interface PublicSeasonData {
  teams: PublicTeam[];
  players: PublicPlayer[];
  matches: PublicMatch[];
  stats: PublicPlayerStats[];
}

async function fetchActiveSeasons(): Promise<PublicSeason[]> {
  console.info(JSON.stringify({
    event: 'supabase_public_cache_miss',
    resource: 'active_seasons',
    supabaseQueries: 1,
  }));

  const { data, error } = await supabase
    .from('seasons')
    .select('id, name, category, year, is_active')
    .eq('is_active', true)
    .order('year', { ascending: false });

  if (error) {
    throw new Error(`No se pudieron cargar las temporadas: ${error.message}`);
  }

  return (data ?? []) as PublicSeason[];
}

async function fetchSeasonData(seasonId: number): Promise<PublicSeasonData> {
  const { data: teamsRaw, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, season_id, status, category')
    .eq('season_id', seasonId)
    .limit(1000);

  if (teamsError) {
    throw new Error(`No se pudieron cargar los equipos: ${teamsError.message}`);
  }

  const teams = (teamsRaw ?? []) as PublicTeam[];
  const teamIds = teams.map((team) => team.id);

  const [playersResult, matchesResult, statsResult] = await Promise.all([
    teamIds.length > 0
      ? supabase
          .from('players')
          .select('id, name, team_id, number')
          .in('team_id', teamIds)
          .limit(5000)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('matches')
      .select(`
        id, season_id, home_team_id, away_team_id,
        home_score, away_score, status,
        jornada, phase, vuelta, scheduled_date, played_date, time_str, court,
        home_team:teams!matches_home_team_id_fkey(id, name),
        away_team:teams!matches_away_team_id_fkey(id, name)
      `)
      .eq('season_id', seasonId)
      .order('jornada', { ascending: true })
      .limit(2000),
    supabase
      .from('player_match_stats')
      .select(`
        player_id, match_id, team_id, played, points, triples,
        matches!inner(season_id)
      `)
      .eq('played', true)
      .eq('matches.season_id', seasonId)
      .limit(10000),
  ]);

  if (playersResult.error) {
    throw new Error(`No se pudieron cargar los jugadores: ${playersResult.error.message}`);
  }

  if (matchesResult.error) {
    throw new Error(`No se pudieron cargar los partidos: ${matchesResult.error.message}`);
  }

  if (statsResult.error) {
    throw new Error(`No se pudieron cargar las estadísticas: ${statsResult.error.message}`);
  }

  const players = (playersResult.data ?? []) as PublicPlayer[];
  const playersById = new Map(players.map((player) => [player.id, player]));
  const stats = (statsResult.data ?? []).map((stat) => {
    const playerId = Number(stat.player_id);
    const player = playersById.get(playerId);

    return {
      match_id: Number(stat.match_id),
      team_id: Number(stat.team_id),
      played: Boolean(stat.played),
      points: stat.points,
      triples: stat.triples,
      players: player
        ? {
            id: player.id,
            name: player.name,
          }
        : null,
    } satisfies PublicPlayerStats;
  });

  console.info(JSON.stringify({
    event: 'supabase_public_cache_miss',
    resource: 'season_data',
    seasonId,
    supabaseQueries: teamIds.length > 0 ? 4 : 3,
  }));

  return {
    teams,
    players,
    matches: (matchesResult.data ?? []) as unknown as PublicMatch[],
    stats,
  };
}

export const getCachedActiveSeasons = unstable_cache(
  fetchActiveSeasons,
  ['public-active-seasons'],
  {
    revalidate: 300,
    tags: [PUBLIC_SEASONS_TAG],
  }
);

export function getCachedPublicSeasonData(seasonId: number) {
  return unstable_cache(
    () => fetchSeasonData(seasonId),
    ['public-season-data-v3', String(seasonId)],
    {
      revalidate: 300,
      tags: [getPublicSeasonTag(seasonId)],
    }
  )();
}
