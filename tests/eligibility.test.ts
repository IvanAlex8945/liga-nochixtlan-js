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
});
