import 'server-only';

import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { formatPlayerNumber } from '@/lib/player-number';

import type { CedulaInscripcionData, CedulaJugador } from './types';

interface TeamRow {
  captain_name?: string | null;
  captain_phone?: string | null;
  category?: string | null;
  id: number;
  name: string;
  season_id: number;
}

interface SeasonRow {
  category?: string | null;
  id: number;
  name: string;
}

const PLAYER_SLOTS = 14;

export async function fetchCedulaInscripcionData(teamId: number): Promise<CedulaInscripcionData> {
  const supabase = await createClient();

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, name, category, season_id, captain_name, captain_phone')
    .eq('id', teamId)
    .single<TeamRow>();

  if (teamError || !team) {
    notFound();
  }

  const [{ data: season }, { data: players, error: playersError }] = await Promise.all([
    supabase
      .from('seasons')
      .select('id, name, category')
      .eq('id', team.season_id)
      .single<SeasonRow>(),
    supabase
      .from('players')
      .select('id, team_id, name, number, photo_url, photo_thumb_url, is_active')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('number', { ascending: true }),
  ]);

  if (playersError) {
    throw playersError;
  }

  const activePlayers = (players ?? []).slice(0, PLAYER_SLOTS).map<CedulaJugador>((player) => ({
    foto_url: player.photo_thumb_url ?? player.photo_url ?? null,
    nombre: player.name,
    numero: formatPlayerNumber(player.number, ''),
  }));

  return {
    equipo: {
      capitan: team.captain_name ?? '',
      categoria: team.category ?? season?.category ?? 'Libre',
      nombre: team.name,
      telefono: team.captain_phone ?? '',
    },
    jugadores: activePlayers,
    temporada: season?.name ?? '',
  };
}
