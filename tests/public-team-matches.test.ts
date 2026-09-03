import { describe, expect, it } from 'vitest';

import { buildTeamEncounters, isPlayedStatus } from '../lib/public-team-matches';

const teams = [
  { id: 1, name: 'Halcones' },
  { id: 2, name: 'Jaguares' },
  { id: 3, name: 'Águilas' },
];

describe('buildTeamEncounters', () => {
  it('incluye ida y vuelta contra todos los rivales aunque no estén registradas', () => {
    const encounters = buildTeamEncounters(1, teams, []);

    expect(encounters).toHaveLength(4);
    expect(encounters.map((encounter) => [encounter.opponent.name, encounter.leg, encounter.match])).toEqual([
      ['Águilas', 'ida', null],
      ['Águilas', 'vuelta', null],
      ['Jaguares', 'ida', null],
      ['Jaguares', 'vuelta', null],
    ]);
  });

  it('respeta la vuelta registrada y deja visible únicamente la que falta', () => {
    const vuelta = {
      id: 20,
      home_team_id: 2,
      away_team_id: 1,
      phase: 'Fase Regular',
      vuelta: 'vuelta' as const,
      status: 'Jugado',
      jornada: 8,
    };

    const jaguares = buildTeamEncounters(1, teams, [vuelta]).filter((item) => item.opponent.id === 2);

    expect(jaguares[0].match).toBeNull();
    expect(jaguares[1].match).toBe(vuelta);
  });

  it('ignora encuentros de liguilla al calcular las vueltas regulares', () => {
    const playoff = {
      id: 30,
      home_team_id: 1,
      away_team_id: 2,
      phase: 'Semifinal',
      vuelta: 'liguilla' as const,
      status: 'Jugado',
    };

    const jaguares = buildTeamEncounters(1, teams, [playoff]).filter((item) => item.opponent.id === 2);
    expect(jaguares.every((item) => item.match === null)).toBe(true);
  });
});

describe('isPlayedStatus', () => {
  it.each(['Jugado', 'WO Local', 'WO Visitante', 'WO Doble', 'W.O. Local'])(
    'reconoce %s como resultado jugado',
    (status) => expect(isPlayedStatus(status)).toBe(true)
  );
});
