import { describe, expect, it } from 'vitest';
import type { PlayerRow } from '../app/components/PlayerAttendanceTable';
import {
  applyReconciledItemsToLineup,
  buildMatchReconciliationReport,
  matchPlayerAgainstRoster,
  type ParsedBoxScoreResponse,
} from '../lib/voice-box-score';

const mockHomeRoster: PlayerRow[] = [
  {
    player_id: 101,
    team_id: 1,
    name: 'María López',
    number: 4,
    played: false,
    points: 0,
    triples: 0,
  },
  {
    player_id: 102,
    team_id: 1,
    name: 'Ana Hernández',
    number: 10,
    played: false,
    points: 0,
    triples: 0,
  },
];

const mockAwayRoster: PlayerRow[] = [
  {
    player_id: 201,
    team_id: 2,
    name: 'Sofía Martínez',
    number: 7,
    played: false,
    points: 0,
    triples: 0,
  },
];

describe('voice-box-score reconciliation logic', () => {
  it('detecta coincidencia exacta (verde) por dorsal y nombre', () => {
    const res = matchPlayerAgainstRoster(
      {
        number: 10,
        name: 'Ana Hernandez',
        points_1pt: 1,
        points_2pt: 4,
        points_3pt: 6,
        total_points: 11,
      },
      mockHomeRoster,
      0,
      'home'
    );

    expect(res.status).toBe('exact');
    expect(res.assignedPlayerId).toBe(102);
    expect(res.totalPoints).toBe(11);
    expect(res.triplesCount).toBe(2);
  });

  it('detecta discrepancia (amarillo) cuando el árbitro puso otro dorsal pero el nombre coincide', () => {
    const res = matchPlayerAgainstRoster(
      {
        number: 14, // En cédula María López tiene el #4
        name: 'Maria Lopez',
        points_1pt: 0,
        points_2pt: 6,
        points_3pt: 3,
        total_points: 9,
      },
      mockHomeRoster,
      0,
      'home'
    );

    expect(res.status).toBe('discrepancy');
    expect(res.assignedPlayerId).toBe(101);
    expect(res.totalPoints).toBe(9);
    expect(res.triplesCount).toBe(1);
  });

  it('marca como no encontrada (rojo) cuando el dorsal no existe en la cédula y es Jugador Desconocido', () => {
    const res = matchPlayerAgainstRoster(
      {
        number: 99,
        name: 'Jugador Desconocido',
        points_1pt: 2,
        points_2pt: 2,
        points_3pt: 0,
        total_points: 4,
      },
      mockHomeRoster,
      0,
      'home'
    );

    expect(res.status).toBe('not_found');
    expect(res.assignedPlayerId).toBeNull();
  });

  it('arma el reporte completo y aplica los puntos correctamente a la tabla de captura', () => {
    const parsed: ParsedBoxScoreResponse = {
      teams: [
        {
          team_name: 'Guerreras',
          team_side: 'home',
          total_team_score: 15,
          players: [
            {
              number: 4,
              name: 'María López',
              points_1pt: 1,
              points_2pt: 4,
              points_3pt: 3,
              total_points: 8,
            },
            {
              number: 10,
              name: 'Jugador Desconocido',
              points_1pt: 1,
              points_2pt: 0,
              points_3pt: 6,
              total_points: 7,
            },
          ],
        },
        {
          team_name: 'Fénix',
          team_side: 'away',
          total_team_score: 5,
          players: [
            {
              number: 7,
              name: 'Sofía Martínez',
              points_1pt: 0,
              points_2pt: 2,
              points_3pt: 3,
              total_points: 5,
            },
          ],
        },
      ],
    };

    const { homeReport, awayReport } = buildMatchReconciliationReport(
      parsed,
      { id: 1, name: 'Guerreras' },
      { id: 2, name: 'Fénix' },
      mockHomeRoster,
      mockAwayRoster
    );

    expect(homeReport.calculatedPlayersSum).toBe(15);
    expect(awayReport.calculatedPlayersSum).toBe(5);

    const updatedHome = applyReconciledItemsToLineup(mockHomeRoster, homeReport.items, 'replace');
    expect(updatedHome.find((p) => p.player_id === 101)).toMatchObject({
      played: true,
      points: 8,
      triples: 1,
    });
    expect(updatedHome.find((p) => p.player_id === 102)).toMatchObject({
      played: true,
      points: 7,
      triples: 2,
    });
  });
});
