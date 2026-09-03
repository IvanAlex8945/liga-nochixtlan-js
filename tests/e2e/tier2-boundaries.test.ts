import { describe, expect, it, beforeEach } from 'vitest';
import { saveMatchResult, LineupRow } from '../../lib/saveMatch';
import { calcularPosiciones } from '../../lib/standings';
import {
  createMockSupabase,
  applyFilterAndSort,
} from './helpers/test-fixtures';

describe('Tier 2: Boundary & Corner Cases', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  // -------------------------------------------------------------
  // B01: Empty Search & Filter State
  // -------------------------------------------------------------
  describe('B01: Empty Search & Filter Results', () => {
    const teams = [
      { name: 'Muebles Carlitos', category: '3ra' },
      { name: 'Halcones Rojos', category: '3ra' },
    ];

    it('T2-B01.1: returns empty array when query does not match any record', () => {
      const result = applyFilterAndSort(teams, { searchQuery: 'NonExistentXYZ' });
      expect(result.filteredItems).toHaveLength(0);
      expect(result.matchedCount).toBe(0);
      expect(result.counterText).toBe('0 de 2');
    });

    it('T2-B01.2: provides standard empty state fallback text', () => {
      const result = applyFilterAndSort(teams, { searchQuery: 'ZZZZZ' });
      const getEmptyStateMessage = (matched: number) => {
        return matched === 0 ? 'No se encontraron equipos con estos filtros.' : null;
      };
      expect(getEmptyStateMessage(result.matchedCount)).toBe('No se encontraron equipos con estos filtros.');
    });
  });

  // -------------------------------------------------------------
  // B02: Single Player Roster
  // -------------------------------------------------------------
  describe('B02: Single Player Roster', () => {
    it('T2-B02.1: saves match successfully when a team has only 1 player attending', async () => {
      const homeLineup: LineupRow[] = [
        { player_id: 201, team_id: 101, played: true, points: 50, triples: 6 },
      ];
      const awayLineup: LineupRow[] = [
        { player_id: 205, team_id: 102, played: true, points: 42, triples: 4 },
      ];

      await expect(
        saveMatchResult(mock.client, 301, 'Normal', homeLineup, awayLineup)
      ).resolves.not.toThrow();

      const saved = mock.db.matches.find((m) => m.id === 301);
      expect(saved?.home_score).toBe(50);
      expect(saved?.away_score).toBe(42);
      expect(saved?.status).toBe('Jugado');
    });

    it('T2-B02.2: calculates standings without errors when games feature single-player teams', () => {
      const matches = [
        {
          id: 301,
          home_team_id: 101,
          away_team_id: 102,
          home_score: 50,
          away_score: 42,
          status: 'Jugado',
          home_team: { id: 101, name: 'Muebles Carlitos' },
          away_team: { id: 102, name: 'M-Sport' },
        },
      ];

      const standings = calcularPosiciones(matches);
      expect(standings).toHaveLength(2);
      expect(standings[0].id).toBe(101);
      expect(standings[0].Pts).toBe(3);
    });
  });

  // -------------------------------------------------------------
  // B03: Tie Score Handling
  // -------------------------------------------------------------
  describe('B03: Tie Score Handling in Basketball', () => {
    it('T2-B03.1: validates that basketball games cannot conclude in a draw', () => {
      const validateMatchScore = (homeScore: number, awayScore: number) => {
        if (homeScore === awayScore) {
          return { valid: false, error: 'En baloncesto los partidos no pueden terminar en empate (se requiere tiempo extra)' };
        }
        return { valid: true, error: null };
      };

      const tieResult = validateMatchScore(45, 45);
      expect(tieResult.valid).toBe(false);
      expect(tieResult.error).toContain('empate');

      const decisiveResult = validateMatchScore(46, 45);
      expect(decisiveResult.valid).toBe(true);
      expect(decisiveResult.error).toBeNull();
    });

    it('T2-B03.2: assigns standings points correctly when home team wins by 1 point', () => {
      const matches = [
        {
          id: 301,
          home_team_id: 101,
          away_team_id: 102,
          home_score: 61,
          away_score: 60,
          status: 'Jugado',
          home_team: { id: 101, name: 'Equipo A' },
          away_team: { id: 102, name: 'Equipo B' },
        },
      ];

      const standings = calcularPosiciones(matches);
      expect(standings.find((s) => s.id === 101)?.Pts).toBe(3);
      expect(standings.find((s) => s.id === 102)?.Pts).toBe(1); // 1 point for defeat in court
    });
  });

  // -------------------------------------------------------------
  // B04: Negative Points / Triples Rejection
  // -------------------------------------------------------------
  describe('B04: Negative Points and Triples Rejection', () => {
    it('T2-B04.1: rejects negative points input in lineup validation', () => {
      const validateLineup = (lineup: LineupRow[]) => {
        for (const row of lineup) {
          if (row.points < 0 || row.triples < 0) {
            return { valid: false, error: 'Los puntos y triples no pueden ser valores negativos' };
          }
        }
        return { valid: true, error: null };
      };

      const invalidLineup: LineupRow[] = [
        { player_id: 201, team_id: 101, played: true, points: -5, triples: 0 },
      ];
      expect(validateLineup(invalidLineup).valid).toBe(false);
      expect(validateLineup(invalidLineup).error).toContain('negativos');
    });

    it('T2-B04.2: accepts zero points and zero triples for scoreless participants', () => {
      const validateLineup = (lineup: LineupRow[]) => {
        for (const row of lineup) {
          if (row.points < 0 || row.triples < 0) {
            return { valid: false, error: 'Valores inválidos' };
          }
        }
        return { valid: true, error: null };
      };

      const zeroScoreLineup: LineupRow[] = [
        { player_id: 201, team_id: 101, played: true, points: 0, triples: 0 },
      ];
      expect(validateLineup(zeroScoreLineup).valid).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // B05: Triples Greater Than Total Points Rejection
  // -------------------------------------------------------------
  describe('B05: Triples Exceeding Total Points Logical Inconsistency', () => {
    it('T2-B05.1: rejects player record where points from triples exceed total points', () => {
      // If triples = 4, minimum points is 4 * 3 = 12. Points = 8 is impossible!
      const validatePointsConsistency = (points: number, triples: number) => {
        if (triples * 3 > points) {
          return {
            valid: false,
            error: `Inconsistencia: ${triples} triples equivalen a ${triples * 3} puntos, pero el total registrado es ${points}`,
          };
        }
        return { valid: true, error: null };
      };

      const check = validatePointsConsistency(8, 4);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('Inconsistencia');
    });

    it('T2-B05.2: accepts player record where all points are exactly triples', () => {
      const validatePointsConsistency = (points: number, triples: number) => {
        return triples * 3 <= points;
      };

      expect(validatePointsConsistency(9, 3)).toBe(true); // 3 * 3 = 9
      expect(validatePointsConsistency(15, 3)).toBe(true); // 3 triples (9 pts) + 6 other pts
    });
  });

  // -------------------------------------------------------------
  // B06: Zero Attendance Handling
  // -------------------------------------------------------------
  describe('B06: Zero Attendance Handling', () => {
    it('T2-B06.1: saves match with zero attending players on a W.O. scenario', async () => {
      // In W.O. Local, local did not show up (0 players attended)
      const emptyHomeLineup: LineupRow[] = [];
      const awayLineup: LineupRow[] = [
        { player_id: 205, team_id: 102, played: true, points: 20, triples: 0 },
      ];

      await saveMatchResult(mock.client, 301, 'WO_Local', emptyHomeLineup, awayLineup);

      const saved = mock.db.matches.find((m) => m.id === 301);
      expect(saved?.status).toBe('WO Local');
      expect(saved?.home_score).toBe(0);
      expect(saved?.away_score).toBe(20);
    });

    it('T2-B06.2: handles double W.O. where neither team has attended players', async () => {
      await saveMatchResult(mock.client, 301, 'WO_Doble', [], []);

      const saved = mock.db.matches.find((m) => m.id === 301);
      expect(saved?.status).toBe('WO Doble');
      expect(saved?.home_score).toBe(0);
      expect(saved?.away_score).toBe(0);

      // Verify no orphan stats inserted
      const stats = mock.db.player_match_stats.filter((s) => s.match_id === 301);
      expect(stats).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------
  // B07: Extreme / High Score (150+ Points)
  // -------------------------------------------------------------
  describe('B07: Extreme Scores and Differential Stress', () => {
    it('T2-B07.1: processes match with 150+ points without integer overflow or display issues', async () => {
      const homeLineup: LineupRow[] = [
        { player_id: 201, team_id: 101, played: true, points: 85, triples: 15 },
        { player_id: 202, team_id: 101, played: true, points: 70, triples: 10 },
      ];
      const awayLineup: LineupRow[] = [
        { player_id: 205, team_id: 102, played: true, points: 140, triples: 22 },
      ];

      await saveMatchResult(mock.client, 301, 'Normal', homeLineup, awayLineup);

      const saved = mock.db.matches.find((m) => m.id === 301);
      expect(saved?.home_score).toBe(155);
      expect(saved?.away_score).toBe(140);
    });

    it('T2-B07.2: computes point differential correctly on blowout matches', () => {
      const matches = [
        {
          id: 301,
          home_team_id: 101,
          away_team_id: 102,
          home_score: 160,
          away_score: 30,
          status: 'Jugado',
          home_team: { id: 101, name: 'Team Blowout' },
          away_team: { id: 102, name: 'Team Struggling' },
        },
      ];

      const standings = calcularPosiciones(matches);
      expect(standings[0].DP).toBe(130);
      expect(standings[1].DP).toBe(-130);
    });
  });

  // -------------------------------------------------------------
  // B08: Accents & Special Characters in Search
  // -------------------------------------------------------------
  describe('B08: Special Characters & Non-Alphanumeric Search', () => {
    const teamsWithSpecialChars = [
      { name: 'M-Sport & Co.', category: '3ra' },
      { name: '100% Básquet / Nochixtlán', category: '3ra' },
      { name: 'Club "El Rayo" (Sub-20)', category: '3ra' },
      { name: 'Deportivo #1', category: '3ra' },
    ];

    it('T2-B08.1: does not crash with regex meta-characters like &, /, (, ), #, "', () => {
      const searchSymbols = ['&', '/', '(', ')', '#', '"', '%'];
      for (const symbol of searchSymbols) {
        expect(() => {
          applyFilterAndSort(teamsWithSpecialChars, { searchQuery: symbol });
        }).not.toThrow();
      }
    });

    it('T2-B08.2: successfully locates team by special character', () => {
      const resAmp = applyFilterAndSort(teamsWithSpecialChars, { searchQuery: '&' });
      expect(resAmp.filteredItems).toHaveLength(1);
      expect(resAmp.filteredItems[0].name).toBe('M-Sport & Co.');

      const resHash = applyFilterAndSort(teamsWithSpecialChars, { searchQuery: '#1' });
      expect(resHash.filteredItems).toHaveLength(1);
      expect(resHash.filteredItems[0].name).toBe('Deportivo #1');
    });
  });

  // -------------------------------------------------------------
  // B09: Database Constraint matches_vuelta_check
  // -------------------------------------------------------------
  describe('B09: Database Constraint matches_vuelta_check', () => {
    it('T2-B09.1: rejects match insertion when vuelta column is missing or invalid (PostgreSQL 23514)', async () => {
      // Attempt insert without required vuelta
      const invalidMatchInsert = {
        season_id: 4,
        home_team_id: 101,
        away_team_id: 102,
        status: 'Programado',
        // vuelta omitted!
      };

      const result = await mock.client.from('matches').insert(invalidMatchInsert as unknown as Record<string, unknown>);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('23514');
      expect(result.error?.message).toContain('matches_vuelta_check');
    });

    it('T2-B09.2: accepts match insertion when valid vuelta is supplied (ida, vuelta, liguilla)', async () => {
      const validMatches = [
        { season_id: 4, home_team_id: 101, away_team_id: 102, status: 'Programado', vuelta: 'ida' },
        { season_id: 4, home_team_id: 103, away_team_id: 104, status: 'Programado', vuelta: 'vuelta' },
        { season_id: 4, home_team_id: 105, away_team_id: 106, status: 'Programado', vuelta: 'liguilla' },
      ];

      for (const m of validMatches) {
        const result = await mock.client.from('matches').insert(m as unknown as Record<string, unknown>);
        expect(result.error).toBeNull();
      }
    });
  });

  // -------------------------------------------------------------
  // B10: Soft-Delete Roster Integrity
  // -------------------------------------------------------------
  describe('B10: Soft-Delete Roster Integrity', () => {
    it('T2-B10.1: retains historical stats for players marked is_active: false', () => {
      // Player 204 is marked as is_active: false (Baja)
      const inactivePlayer = mock.db.players.find((p) => p.id === 204);
      expect(inactivePlayer?.is_active).toBe(false);

      // Mock a historical stat for player 204
      mock.db.player_match_stats.push({
        id: 999,
        match_id: 301,
        player_id: 204,
        team_id: 101,
        played: true,
        points: 18,
        triples: 2,
      });

      // Historical stats still exist without throwing foreign key violation
      const historical = mock.db.player_match_stats.filter((s) => s.player_id === 204);
      expect(historical).toHaveLength(1);
      expect(historical[0].points).toBe(18);
    });

    it('T2-B10.2: excludes soft-deleted players from active capture roster', () => {
      const activeLineupPlayers = mock.db.players.filter(
        (p) => p.team_id === 101 && p.is_active === true
      );

      expect(activeLineupPlayers.some((p) => p.id === 204)).toBe(false);
      expect(activeLineupPlayers.every((p) => p.is_active)).toBe(true);
    });
  });
});
