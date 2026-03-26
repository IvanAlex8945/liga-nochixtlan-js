/**
 * lib/standings.ts — Liga Nochixtlán
 * Computes standings purely from matches rows.
 * NO reference to teams.games_played or any computed column in teams table.
 */

export interface TeamStats {
  id: number;
  equipo: string;
  PJ: number;
  PG: number;
  PP: number;
  WO: number;
  PF: number;
  PC: number;
  DP: number;
  Pts: number;
}

export interface MatchForStandings {
  id: number;
  season_id?: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  home_team: { id: number; name: string };
  away_team: { id: number; name: string };
}

export function calcularPosiciones(matches: MatchForStandings[]): TeamStats[] {
  const stats: Record<number, TeamStats> = {};

  const init = (id: number, nombre: string) => {
    if (!stats[id]) {
      stats[id] = { id, equipo: nombre, PJ: 0, PG: 0, PP: 0, WO: 0, PF: 0, PC: 0, DP: 0, Pts: 0 };
    }
  };

  for (const m of matches) {
    if (!m.home_team || !m.away_team) continue;
    init(m.home_team_id, m.home_team.name);
    init(m.away_team_id, m.away_team.name);
    const h = stats[m.home_team_id];
    const a = stats[m.away_team_id];

    if (m.status === 'Jugado') {
      const hs = m.home_score ?? 0;
      const as_ = m.away_score ?? 0;
      h.PJ++; a.PJ++;
      h.PF += hs; h.PC += as_;
      a.PF += as_; a.PC += hs;
      if (hs > as_) {
        h.PG++; h.Pts += 3;
        a.PP++; a.Pts += 1;
      } else {
        a.PG++; a.Pts += 3;
        h.PP++; h.Pts += 1;
      }
    } else if (m.status === 'WO Local') {
      h.PJ++; h.WO++; h.PC += 20;
      a.PJ++; a.PG++; a.PF += 20; a.Pts += 3;
    } else if (m.status === 'WO Visitante') {
      a.PJ++; a.WO++; a.PC += 20;
      h.PJ++; h.PG++; h.PF += 20; h.Pts += 3;
    } else if (m.status === 'WO Doble') {
      h.PJ++; h.WO++;
      a.PJ++; a.WO++;
    }
  }

  return Object.values(stats)
    .map((s) => ({ ...s, DP: s.PF - s.PC }))
    .sort((a, b) => b.Pts - a.Pts || b.DP - a.DP);
}
