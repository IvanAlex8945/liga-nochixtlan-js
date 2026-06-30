export interface TeamMatchTeam { id: number; name: string; }
export interface TeamMatchRecord {
  id: number;
  home_team_id?: number;
  away_team_id?: number;
  phase?: string | null;
  status?: string | null;
  vuelta?: 'ida' | 'vuelta' | 'liguilla' | null;
  jornada?: number | null;
}
export interface TeamEncounter<TMatch extends TeamMatchRecord> {
  key: string;
  opponent: TeamMatchTeam;
  leg: 'ida' | 'vuelta';
  match: TMatch | null;
}
export function isRegularPhase(phase?: string | null) { return !phase || phase === 'Fase Regular'; }
export function isPlayedStatus(status?: string | null) {
  return status === 'Jugado' || Boolean(status?.startsWith('WO') || status?.startsWith('W.O'));
}
export function buildTeamEncounters<TMatch extends TeamMatchRecord>(teamId: number, teams: TeamMatchTeam[], matches: TMatch[]) {
  return teams.filter((team) => team.id !== teamId).sort((a, b) => a.name.localeCompare(b.name, 'es')).flatMap((opponent) => {
    const registered = matches.filter((match) => isRegularPhase(match.phase) &&
      ((match.home_team_id === teamId && match.away_team_id === opponent.id) ||
       (match.home_team_id === opponent.id && match.away_team_id === teamId)))
      .sort((a, b) => (a.jornada ?? Number.MAX_SAFE_INTEGER) - (b.jornada ?? Number.MAX_SAFE_INTEGER) || a.id - b.id);
    const assigned: Partial<Record<'ida' | 'vuelta', TMatch>> = {};
    const unassigned: TMatch[] = [];
    for (const match of registered) {
      if ((match.vuelta === 'ida' || match.vuelta === 'vuelta') && !assigned[match.vuelta]) assigned[match.vuelta] = match;
      else unassigned.push(match);
    }
    for (const leg of ['ida', 'vuelta'] as const) if (!assigned[leg]) assigned[leg] = unassigned.shift();
    return (['ida', 'vuelta'] as const).map((leg) => ({ key: `${teamId}-${opponent.id}-${leg}`, opponent, leg, match: assigned[leg] ?? null }));
  });
}
