import { describe, expect, it } from 'vitest';
import { calcularPosiciones, type MatchForStandings } from '../lib/standings';

function buildMatch(match: Partial<MatchForStandings>): MatchForStandings {
  return {
    id: 1,
    home_team_id: 1,
    away_team_id: 2,
    home_score: 0,
    away_score: 0,
    status: 'Programado',
    home_team: { id: 1, name: 'Local' },
    away_team: { id: 2, name: 'Visitante' },
    ...match,
  };
}

describe('lib/standings', () => {
  it('aplica puntos y estadisticas de un juego normal', () => {
    const table = calcularPosiciones([
      buildMatch({
        status: 'Jugado',
        home_score: 80,
        away_score: 70,
        home_team: { id: 1, name: 'Tigres' },
        away_team: { id: 2, name: 'Halcones' },
      }),
    ]);

    expect(table).toEqual([
      {
        id: 1,
        equipo: 'Tigres',
        PJ: 1,
        PG: 1,
        PP: 0,
        WO: 0,
        PF: 80,
        PC: 70,
        DP: 10,
        Pts: 3,
      },
      {
        id: 2,
        equipo: 'Halcones',
        PJ: 1,
        PG: 0,
        PP: 1,
        WO: 0,
        PF: 70,
        PC: 80,
        DP: -10,
        Pts: 1,
      },
    ]);
  });

  it('registra correctamente un WO Local', () => {
    const table = calcularPosiciones([
      buildMatch({
        status: 'WO Local',
        home_team: { id: 1, name: 'Tigres' },
        away_team: { id: 2, name: 'Halcones' },
      }),
    ]);

    expect(table[0]).toMatchObject({
      id: 2,
      equipo: 'Halcones',
      PJ: 1,
      PG: 1,
      PP: 0,
      WO: 0,
      PF: 20,
      PC: 0,
      DP: 20,
      Pts: 3,
    });

    expect(table[1]).toMatchObject({
      id: 1,
      equipo: 'Tigres',
      PJ: 1,
      PG: 0,
      PP: 0,
      WO: 1,
      PF: 0,
      PC: 20,
      DP: -20,
      Pts: 0,
    });
  });

  it('registra doble WO sin puntos para ambos equipos', () => {
    const table = calcularPosiciones([
      buildMatch({
        status: 'WO Doble',
        home_team: { id: 1, name: 'Tigres' },
        away_team: { id: 2, name: 'Halcones' },
      }),
    ]);

    expect(table).toHaveLength(2);
    expect(table[0]).toMatchObject({ PJ: 1, WO: 1, Pts: 0, DP: 0 });
    expect(table[1]).toMatchObject({ PJ: 1, WO: 1, Pts: 0, DP: 0 });
  });

  it('desempata por diferencia de puntos cuando hay mismos puntos', () => {
    const table = calcularPosiciones([
      buildMatch({
        id: 1,
        status: 'Jugado',
        home_team_id: 1,
        away_team_id: 2,
        home_score: 90,
        away_score: 80,
        home_team: { id: 1, name: 'Tigres' },
        away_team: { id: 2, name: 'Halcones' },
      }),
      buildMatch({
        id: 2,
        status: 'Jugado',
        home_team_id: 3,
        away_team_id: 4,
        home_score: 70,
        away_score: 60,
        home_team: { id: 3, name: 'Leones' },
        away_team: { id: 4, name: 'Panteras' },
      }),
    ]);

    expect(table[0]).toMatchObject({ id: 1, Pts: 3, DP: 10 });
    expect(table[1]).toMatchObject({ id: 3, Pts: 3, DP: 10 });
    expect(table[2]).toMatchObject({ id: 2, Pts: 1, DP: -10 });
    expect(table[3]).toMatchObject({ id: 4, Pts: 1, DP: -10 });
  });
});
