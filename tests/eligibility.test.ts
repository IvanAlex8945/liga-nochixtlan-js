import { describe, expect, it } from 'vitest';
import { calcularElegibilidad } from '../lib/eligibility';

function createSupabaseMock() {
  const players = [
    { id: 10, name: 'Ana' },
    { id: 11, name: 'Beto' },
    { id: 12, name: 'Caro' },
  ];

  const statsRows = [
    { player_id: 10, played: true, match_id: 1, matches: { season_id: 99 } },
    { player_id: 10, played: true, match_id: 2, matches: { season_id: 99 } },
    { player_id: 10, played: true, match_id: 3, matches: { season_id: 99 } },
    { player_id: 11, played: true, match_id: 1, matches: { season_id: 99 } },
    { player_id: 11, played: true, match_id: 2, matches: { season_id: 99 } },
    { player_id: 11, played: true, match_id: 4, matches: { season_id: 100 } },
  ];

  return {
    from(table: string) {
      if (table === 'matches') {
        const query = {
          select() {
            return query;
          },
          eq() {
            return query;
          },
          in() {
            return query;
          },
          async or() {
            return { count: 5 };
          },
        };
        return query;
      }

      if (table === 'player_match_stats') {
        let eqCalls = 0;
        const query = {
          select() {
            return query;
          },
          eq() {
            eqCalls += 1;
            if (eqCalls < 2) {
              return query;
            }
            return Promise.resolve({ data: statsRows });
          },
        };
        return query;
      }

      if (table === 'players') {
        let eqCalls = 0;
        const query = {
          select() {
            return query;
          },
          eq() {
            eqCalls += 1;
            if (eqCalls < 2) {
              return query;
            }
            return Promise.resolve({ data: players });
          },
        };
        return query;
      }

      throw new Error(`Tabla no esperada: ${table}`);
    },
  };
}

import fs from 'fs';
import { generateEligibilityPDF } from '../lib/pdfReport';

describe('lib/eligibility', () => {
  it('calcula elegibilidad con la formula oficial y filtra por temporada', async () => {
    const result = await calcularElegibilidad(
      createSupabaseMock() as never,
      7,
      99
    );

    expect(result.totalPartidos).toBe(5);
    expect(result.minRequerido).toBe(3);
    expect(result.results).toEqual([
      {
        jugador_id: 10,
        nombre: 'Ana',
        asistencias: 3,
        min_requerido: 3,
        elegible: true,
      },
      {
        jugador_id: 11,
        nombre: 'Beto',
        asistencias: 2,
        min_requerido: 3,
        elegible: false,
      },
      {
        jugador_id: 12,
        nombre: 'Caro',
        asistencias: 0,
        min_requerido: 3,
        elegible: false,
      },
    ]);
  });

  it('genera reporte PDF con notas institucionales y formato claro de elegibilidad', () => {
    const standingsMock = [
      {
        id: 1,
        equipo: 'Halcones',
        jj: 4,
        jg: 3,
        jp: 1,
        puntos: 9,
        pf: 150,
        pc: 120,
        dif: 30,
        posicion: 1,
      },
    ];

    const seasonMatchesMock = [
      { id: 101, home_team_id: 1, away_team_id: 2, status: 'Jugado' },
      { id: 102, home_team_id: 2, away_team_id: 1, status: 'Jugado' },
    ];

    const allStatsMock = [
      {
        player_id: 201,
        match_id: 101,
        team_id: 1,
        played: true,
        points: 10,
        triples: 2,
        players: { id: 201, name: 'Juan Perez' },
      },
      {
        player_id: 201,
        match_id: 102,
        team_id: 1,
        played: true,
        points: 12,
        triples: 1,
        players: { id: 201, name: 'Juan Perez' },
      },
    ];

    const fileName = 'Elegibilidad_Temporada_Test.pdf';
    if (fs.existsSync(fileName)) fs.unlinkSync(fileName);

    expect(() => {
      generateEligibilityPDF(
        standingsMock as never,
        seasonMatchesMock,
        'Temporada Test',
        allStatsMock
      );
    }).not.toThrow();

    expect(fs.existsSync(fileName)).toBe(true);
    if (fs.existsSync(fileName)) fs.unlinkSync(fileName);
  });
});
