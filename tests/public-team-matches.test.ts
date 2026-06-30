import { describe, expect, it } from 'vitest';
import { buildTeamEncounters, isPlayedStatus } from '../lib/public-team-matches';

const teams = [{ id: 1, name: 'Halcones' }, { id: 2, name: 'Jaguares' }, { id: 3, name: 'Águilas' }];

describe('buildTeamEncounters', () => {
  it('incluye dos juegos contra cada rival aunque no estén registrados', () => {
    const encounters = buildTeamEncounters(1, teams, []);
    expect(encounters).toHaveLength(4);
    expect(encounters.every((encounter) => encounter.match === null)).toBe(true);
  });
  it('respeta la vuelta registrada y conserva la ida faltante', () => {
    const match = { id: 10, home_team_id: 2, away_team_id: 1, phase: 'Fase Regular', vuelta: 'vuelta' as const, status: 'Jugado' };
    const result = buildTeamEncounters(1, teams, [match]).filter((item) => item.opponent.id === 2);
    expect(result[0].match).toBeNull();
    expect(result[1].match).toBe(match);
  });
  it('no cuenta la liguilla como vuelta regular', () => {
    const match = { id: 11, home_team_id: 1, away_team_id: 2, phase: 'Semifinal', vuelta: 'liguilla' as const, status: 'Jugado' };
    expect(buildTeamEncounters(1, teams, [match]).filter((item) => item.opponent.id === 2).every((item) => item.match === null)).toBe(true);
  });
});

describe('isPlayedStatus', () => {
  it.each(['Jugado', 'WO Local', 'WO Visitante', 'WO Doble', 'W.O. Local'])('reconoce %s como jugado', (status) => {
    expect(isPlayedStatus(status)).toBe(true);
  });
});
