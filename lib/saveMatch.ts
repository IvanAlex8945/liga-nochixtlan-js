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
  awayLineup: LineupRow[]
): Promise<void> {
  // Usa los puntos capturados tal cual
  const processLineup = (lineup: LineupRow[]): LineupRow[] => lineup;

  // Calcula el score basándose en los puntos asignados
  const homeScore = homeLineup.reduce((s, r) => s + (r.points ?? 0), 0);
  const awayScore = awayLineup.reduce((s, r) => s + (r.points ?? 0), 0);

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

  // --- AUTOMATED LIGUILLA SERIES LOGIC ---
  
  // 1. Fetch current match details to identify the series
  const { data: matchData, error: fetchErr } = await supabase
    .from('matches')
    .select('season_id, phase, home_team_id, away_team_id')
    .eq('id', matchId)
    .single();

  if (!fetchErr && matchData && matchData.phase && matchData.phase !== 'Fase Regular') {
    const teamA = matchData.home_team_id;
    const teamB = matchData.away_team_id;

    // 2. Fetch all matches in this series between teamA and teamB
    const { data: seriesMatches } = await supabase
      .from('matches')
      .select('id, status, home_score, away_score, home_team_id, away_team_id')
      .eq('season_id', matchData.season_id)
      .eq('phase', matchData.phase)
      .in('home_team_id', [teamA, teamB])
      .in('away_team_id', [teamA, teamB]);

    if (seriesMatches && seriesMatches.length > 0) {
      let winsA = 0;
      let winsB = 0;

      // 3. Tally wins based on played statuses
      for (const m of seriesMatches) {
        if (['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status)) {
          const scoreH = m.home_score || 0;
          const scoreA = m.away_score || 0;
          if (scoreH > scoreA) {
            if (m.home_team_id === teamA) winsA++; else winsB++;
          } else if (scoreA > scoreH) {
            if (m.away_team_id === teamA) winsA++; else winsB++;
          }
        }
      }

      // 4. Determine if the 3rd game is needed or not
      if (winsA >= 2 || winsB >= 2) {
        // Someone won the series: mark 'Programado' as 'No Necesario'
        const toCancel = seriesMatches.filter(m => m.status === 'Programado');
        if (toCancel.length > 0) {
          await supabase
            .from('matches')
            .update({ status: 'No Necesario' })
            .in('id', toCancel.map(m => m.id));
        }
      } else {
        // Series is not decided: revert any 'No Necesario' back to 'Programado'
        const toRevert = seriesMatches.filter(m => m.status === 'No Necesario');
        if (toRevert.length > 0) {
          await supabase
            .from('matches')
            .update({ status: 'Programado' })
            .in('id', toRevert.map(m => m.id));
        }
      }
    }
  }
}

