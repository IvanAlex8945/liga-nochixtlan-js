import { SupabaseClient } from '@supabase/supabase-js';

export type ResultType = 'Normal' | 'WO_Local' | 'WO_Visitante' | 'WO_Doble';

export interface LineupRow {
  player_id: number;
  team_id: number;
  played: boolean;
  points: number;
  triples: number;
}

const statusMap: Record<ResultType, string> = {
  Normal: 'Jugado',
  WO_Local: 'WO Local',
  WO_Visitante: 'WO Visitante',
  WO_Doble: 'WO Doble',
};

const scoreMap: Record<ResultType, { home: number | null; away: number | null }> = {
  Normal: { home: null, away: null },
  WO_Local: { home: 0, away: 20 },      // local forfeits → visitante wins
  WO_Visitante: { home: 20, away: 0 },  // away forfeits → local wins
  WO_Doble: { home: 0, away: 0 },
};

export async function saveMatchResult(
  supabase: SupabaseClient,
  matchId: number,
  resultType: ResultType,
  homeLineup: LineupRow[],
  awayLineup: LineupRow[],
  woScorerId?: number // player who receives 20 pts in W.O.
): Promise<void> {
  // Process lineup: in W.O. mode block stats except the wo scorer
  const processLineup = (lineup: LineupRow[]): LineupRow[] =>
    lineup.map((row) => ({
      ...row,
      points:
        resultType !== 'Normal'
          ? row.player_id === woScorerId
            ? 20
            : 0
          : row.points,
      triples: resultType !== 'Normal' ? 0 : row.triples,
    }));

  // Calculate score
  const homeScore =
    resultType === 'Normal'
      ? homeLineup.reduce((s, r) => s + (r.points ?? 0), 0)
      : scoreMap[resultType].home;

  const awayScore =
    resultType === 'Normal'
      ? awayLineup.reduce((s, r) => s + (r.points ?? 0), 0)
      : scoreMap[resultType].away;

  // Update match
  const { error: matchErr } = await supabase
    .from('matches')
    .update({
      status: statusMap[resultType],
      home_score: homeScore,
      away_score: awayScore,
      played_date: new Date().toISOString(),
    })
    .eq('id', matchId);

  if (matchErr) throw new Error(`Error al guardar partido: ${matchErr.message}`);

  // Delete previous stats
  await supabase.from('player_match_stats').delete().eq('match_id', matchId);

  // Insert new stats (only attended players)
  const processed = [
    ...processLineup(homeLineup),
    ...processLineup(awayLineup),
  ].filter((r) => r.played);

  const allStats = processed.map((r) => ({
    match_id: matchId,
    player_id: r.player_id,
    team_id: r.team_id,
    played: r.played,
    points: r.points,
    triples: r.triples,
  }));

  if (allStats.length > 0) {
    const { error: statsErr } = await supabase.from('player_match_stats').insert(allStats);
    if (statsErr) throw new Error(`Error al guardar estadísticas: ${statsErr.message}`);
  }
}
