import { describe, expect, it, beforeEach } from 'vitest';
import { saveMatchResult } from '../../lib/saveMatch';
import { calcularPosiciones } from '../../lib/standings';
import { calcularElegibilidad } from '../../lib/eligibility';
import { canAccessPath, buildAccessSnapshot } from '../../lib/access-control';
import {
  createMockSupabase,
  DatabaseState,
} from './helpers/test-fixtures';

describe('Tier 4: Real-World Scenarios', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  // -------------------------------------------------------------
  // Scenario 1: Full Jornada Capture Session
  // -------------------------------------------------------------
  describe('S01: Full Jornada Capture Session (Jornada 1: 3 Matches)', () => {
    it('T4-S01.1: executes end-to-end capture of an entire jornada, advancing pending queue to 0', async () => {
      // Add third match for Jornada 1
      mock.db.matches.push({
        id: 304,
        season_id: 4,
        jornada: 1,
        home_team_id: 105,
        away_team_id: 106,
        status: 'Programado',
        vuelta: 'ida',
        phase: 'Fase Regular',
      });

      const getPendingJornadaMatches = () =>
        mock.db.matches.filter((m) => m.jornada === 1 && m.status === 'Programado');

      // Initial queue: 3 matches pending capture
      expect(getPendingJornadaMatches()).toHaveLength(3);

      // --- Match 1: Team 101 vs Team 102 ---
      await saveMatchResult(
        mock.client,
        301,
        'Normal',
        [{ player_id: 201, team_id: 101, played: true, points: 55, triples: 3 }],
        [{ player_id: 205, team_id: 102, played: true, points: 48, triples: 2 }]
      );
      expect(getPendingJornadaMatches()).toHaveLength(2);

      // --- Match 2: Team 103 vs Team 104 ---
      await saveMatchResult(
        mock.client,
        302,
        'Normal',
        [{ player_id: 207, team_id: 103, played: true, points: 62, triples: 4 }],
        [{ player_id: 208, team_id: 104, played: true, points: 60, triples: 5 }]
      );
      expect(getPendingJornadaMatches()).toHaveLength(1);

      // --- Match 3: Team 105 vs Team 106 (WO Visitante) ---
      await saveMatchResult(mock.client, 304, 'WO_Visitante', [], []);
      expect(getPendingJornadaMatches()).toHaveLength(0); // Entire jornada captured!

      // Compute final Jornada 1 standings
      const standings = calcularPosiciones(
        mock.db.matches.map((m) => ({
          ...m,
          home_team: { id: m.home_team_id, name: `Team ${m.home_team_id}` },
          away_team: { id: m.away_team_id, name: `Team ${m.away_team_id}` },
        }))
      );

      // 3 winners with 3 points each: 105 (WO diff +20), 101 (diff +7), 103 (diff +2)
      const winners = standings.filter((s) => s.Pts === 3);
      expect(winners).toHaveLength(3);
      expect(standings[0].id).toBe(105); // Highest DP (+20 from W.O.) is 1st place!
      expect(standings[0].DP).toBe(20);
    });
  });

  // -------------------------------------------------------------
  // Scenario 2: Multi-Team Registration & Playoff Eligibility Verification
  // -------------------------------------------------------------
  describe('S02: Multi-Team Registration & Playoff Eligibility', () => {
    it('T4-S02.1: calculates playoff eligibility using the official floor(N/2) + 1 rule', async () => {
      // Setup a custom state for eligibility testing:
      // Team 101 has played 4 regular season matches
      // Required attendance: floor(4 / 2) + 1 = 3 matches
      const eligibilityState: DatabaseState = {
        ...mock.db,
        matches: [
          { id: 501, season_id: 4, home_team_id: 101, away_team_id: 102, status: 'Jugado', vuelta: 'ida', phase: 'Fase Regular' },
          { id: 502, season_id: 4, home_team_id: 101, away_team_id: 103, status: 'Jugado', vuelta: 'ida', phase: 'Fase Regular' },
          { id: 503, season_id: 4, home_team_id: 101, away_team_id: 104, status: 'Jugado', vuelta: 'ida', phase: 'Fase Regular' },
          { id: 504, season_id: 4, home_team_id: 101, away_team_id: 105, status: 'Jugado', vuelta: 'ida', phase: 'Fase Regular' },
        ],
        players: [
          { id: 601, team_id: 101, name: 'Eligible Player A (4 games)', number: '1', is_active: true },
          { id: 602, team_id: 101, name: 'Eligible Player B (3 games)', number: '2', is_active: true },
          { id: 603, team_id: 101, name: 'Ineligible Player C (2 games)', number: '3', is_active: true },
          { id: 604, team_id: 101, name: 'Ineligible Player D (0 games)', number: '4', is_active: true },
        ],
        player_match_stats: [
          // Player 601: 4 games
          { id: 1, match_id: 501, player_id: 601, team_id: 101, played: true, points: 10, triples: 1 },
          { id: 2, match_id: 502, player_id: 601, team_id: 101, played: true, points: 12, triples: 1 },
          { id: 3, match_id: 503, player_id: 601, team_id: 101, played: true, points: 15, triples: 2 },
          { id: 4, match_id: 504, player_id: 601, team_id: 101, played: true, points: 8, triples: 0 },
          // Player 602: 3 games
          { id: 5, match_id: 501, player_id: 602, team_id: 101, played: true, points: 6, triples: 0 },
          { id: 6, match_id: 502, player_id: 602, team_id: 101, played: true, points: 9, triples: 1 },
          { id: 7, match_id: 503, player_id: 602, team_id: 101, played: true, points: 4, triples: 0 },
          // Player 603: 2 games
          { id: 8, match_id: 501, player_id: 603, team_id: 101, played: true, points: 5, triples: 0 },
          { id: 9, match_id: 502, player_id: 603, team_id: 101, played: true, points: 7, triples: 1 },
        ],
      };

      const customMock = createMockSupabase(eligibilityState);
      const { results, totalPartidos, minRequerido } = await calcularElegibilidad(
        customMock.client,
        101,
        4
      );

      expect(totalPartidos).toBe(4);
      expect(minRequerido).toBe(3); // floor(4/2) + 1 = 3

      const p601 = results.find((r) => r.jugador_id === 601);
      expect(p601?.asistencias).toBe(4);
      expect(p601?.elegible).toBe(true);

      const p602 = results.find((r) => r.jugador_id === 602);
      expect(p602?.asistencias).toBe(3);
      expect(p602?.elegible).toBe(true);

      const p603 = results.find((r) => r.jugador_id === 603);
      expect(p603?.asistencias).toBe(2);
      expect(p603?.elegible).toBe(false); // 2 < 3 -> Not eligible

      const p604 = results.find((r) => r.jugador_id === 604);
      expect(p604?.asistencias).toBe(0);
      expect(p604?.elegible).toBe(false); // 0 < 3 -> Not eligible
    });
  });

  // -------------------------------------------------------------
  // Scenario 3: Liguilla Best-of-3 Series Automation
  // -------------------------------------------------------------
  describe('S03: Liguilla Best-of-3 Series Automation', () => {
    it('T4-S03.1: cancels Game 3 (sets No Necesario) automatically when a team sweeps 2-0', async () => {
      // 3 matches in playoff quarterfinal between Team 101 and Team 102
      mock.db.matches = [
        {
          id: 701,
          season_id: 4,
          jornada: 1,
          home_team_id: 101,
          away_team_id: 102,
          status: 'Programado',
          phase: 'Cuartos de Final',
          vuelta: 'liguilla',
        },
        {
          id: 702,
          season_id: 4,
          jornada: 1,
          home_team_id: 102,
          away_team_id: 101,
          status: 'Programado',
          phase: 'Cuartos de Final',
          vuelta: 'liguilla',
        },
        {
          id: 703,
          season_id: 4,
          jornada: 1,
          home_team_id: 101,
          away_team_id: 102,
          status: 'Programado',
          phase: 'Cuartos de Final',
          vuelta: 'liguilla',
        },
      ];

      // Game 1: Team 101 wins (1-0)
      await saveMatchResult(
        mock.client,
        701,
        'Normal',
        [{ player_id: 201, team_id: 101, played: true, points: 60, triples: 2 }],
        [{ player_id: 205, team_id: 102, played: true, points: 50, triples: 1 }]
      );
      // Game 3 is still needed (series 1-0)
      expect(mock.db.matches.find((m) => m.id === 703)?.status).toBe('Programado');

      // Game 2: Team 101 wins again (2-0 sweep)
      await saveMatchResult(
        mock.client,
        702,
        'Normal',
        [{ player_id: 205, team_id: 102, played: true, points: 45, triples: 1 }],
        [{ player_id: 201, team_id: 101, played: true, points: 55, triples: 3 }]
      );

      // Automated logic in saveMatchResult: Game 3 must now be 'No Necesario'!
      const game3 = mock.db.matches.find((m) => m.id === 703);
      expect(game3?.status).toBe('No Necesario');
    });

    it('T4-S03.2: keeps Game 3 Programado if series is tied 1-1', async () => {
      mock.db.matches = [
        {
          id: 801,
          season_id: 4,
          jornada: 1,
          home_team_id: 101,
          away_team_id: 102,
          status: 'Programado',
          phase: 'Semifinal',
          vuelta: 'liguilla',
        },
        {
          id: 802,
          season_id: 4,
          jornada: 1,
          home_team_id: 102,
          away_team_id: 101,
          status: 'Programado',
          phase: 'Semifinal',
          vuelta: 'liguilla',
        },
        {
          id: 803,
          season_id: 4,
          jornada: 1,
          home_team_id: 101,
          away_team_id: 102,
          status: 'Programado',
          phase: 'Semifinal',
          vuelta: 'liguilla',
        },
      ];

      // Game 1: Team 101 wins
      await saveMatchResult(
        mock.client,
        801,
        'Normal',
        [{ player_id: 201, team_id: 101, played: true, points: 60, triples: 2 }],
        [{ player_id: 205, team_id: 102, played: true, points: 50, triples: 1 }]
      );

      // Game 2: Team 102 wins (Ties series 1-1)
      await saveMatchResult(
        mock.client,
        802,
        'Normal',
        [{ player_id: 205, team_id: 102, played: true, points: 65, triples: 4 }],
        [{ player_id: 201, team_id: 101, played: true, points: 55, triples: 2 }]
      );

      // Series is 1-1: Game 3 MUST remain 'Programado' for decider
      const game3 = mock.db.matches.find((m) => m.id === 803);
      expect(game3?.status).toBe('Programado');
    });
  });

  // -------------------------------------------------------------
  // Scenario 4: Role-Based Admin Operations Matrix
  // -------------------------------------------------------------
  describe('S04: Role-Based Admin Operations Matrix (RBAC)', () => {
    it('T4-S04.1: allows super_admin full access to all admin sections', () => {
      const snap = buildAccessSnapshot('admin1@liganochixtlan.com');
      expect(snap.role).toBe('super_admin');

      const adminRoutes = [
        '/admin',
        '/admin/seasons',
        '/admin/teams',
        '/admin/calendar',
        '/admin/capture',
        '/admin/eligibility',
        '/admin/access',
      ];

      for (const route of adminRoutes) {
        expect(canAccessPath(route, snap.role)).toBe(true);
      }
    });

    it('T4-S04.2: enforces role barriers for specialized roles', () => {
      const capturaSnap = buildAccessSnapshot('captura@liganochixtlan.com');
      expect(capturaSnap.role).toBe('captura_resultados');

      // Captura role can access dashboard, capture, and eligibility
      expect(canAccessPath('/admin', capturaSnap.role)).toBe(true);
      expect(canAccessPath('/admin/capture', capturaSnap.role)).toBe(true);
      expect(canAccessPath('/admin/eligibility', capturaSnap.role)).toBe(true);

      // Captura role CANNOT access teams, calendar, seasons, or access
      expect(canAccessPath('/admin/teams', capturaSnap.role)).toBe(false);
      expect(canAccessPath('/admin/calendar', capturaSnap.role)).toBe(false);
      expect(canAccessPath('/admin/seasons', capturaSnap.role)).toBe(false);
      expect(canAccessPath('/admin/access', capturaSnap.role)).toBe(false);
    });

    it('T4-S04.3: denies access unconditionally when unauthenticated or role is null', () => {
      expect(canAccessPath('/admin', null)).toBe(false);
      expect(canAccessPath('/admin/capture', null)).toBe(false);
      expect(canAccessPath('/admin/teams', null)).toBe(false);
    });
  });
});
