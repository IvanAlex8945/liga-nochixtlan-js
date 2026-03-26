import { SupabaseClient } from '@supabase/supabase-js';

export interface EligibilityResult {
  jugador_id: number;
  nombre: string;
  asistencias: number;
  min_requerido: number;
  elegible: boolean;
}

export async function calcularElegibilidad(
  supabase: SupabaseClient,
  team_id: number,
  season_id: number
): Promise<{ results: EligibilityResult[]; totalPartidos: number; minRequerido: number }> {
  // 1. Total de partidos finalizados del equipo en esta temporada
  const { count: total } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', season_id)
    .in('status', ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'])
    .or(`home_team_id.eq.${team_id},away_team_id.eq.${team_id}`);

  const totalPartidos = total ?? 0;
  const minRequerido = Math.floor(totalPartidos / 2) + 1;

  // 2. Asistencias por jugador
  const { data: statsRaw } = await supabase
    .from('player_match_stats')
    .select('player_id, played, match_id, matches!inner(season_id)')
    .eq('team_id', team_id)
    .eq('played', true);

  // Filter by season (join already done via !inner)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = (statsRaw ?? []).filter((s: any) => s.matches?.season_id === season_id);

  // 3. Agrupar por jugador
  const asistMap: Record<number, number> = {};
  for (const s of stats) {
    asistMap[s.player_id] = (asistMap[s.player_id] ?? 0) + 1;
  }

  // 4. Lista de jugadores activos del equipo
  const { data: players } = await supabase
    .from('players')
    .select('id, name')
    .eq('team_id', team_id)
    .eq('is_active', true);

  const results: EligibilityResult[] = (players ?? [])
    .map((p) => ({
      jugador_id: p.id,
      nombre: p.name,
      asistencias: asistMap[p.id] ?? 0,
      min_requerido: minRequerido,
      elegible: totalPartidos > 0 && (asistMap[p.id] ?? 0) >= minRequerido,
    }))
    .sort((a, b) => +b.elegible - +a.elegible || b.asistencias - a.asistencias);

  return { results, totalPartidos, minRequerido };
}
