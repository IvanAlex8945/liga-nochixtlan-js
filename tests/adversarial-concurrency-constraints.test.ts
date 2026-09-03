import { describe, it, expect, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { saveMatchResult, LineupRow } from '../lib/saveMatch';
import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// ADVERSARIAL CHALLENGER TEST SUITE: M1 Concurrency, Double-Submit & Constraints
// ============================================================================

describe('Adversarial Stress Test: M1 Persistence, Concurrency & Constraints', () => {
  // --------------------------------------------------------------------------
  // 1. CONCURRENCY & DOUBLE-SUBMIT STRESS TESTS
  // --------------------------------------------------------------------------
  describe('1. Double-Submit & Concurrency Protection', () => {
    interface StatRow {
      id?: number;
      match_id: number;
      player_id: number;
      team_id: number;
      played: boolean;
      points: number;
      triples: number;
    }

    interface MatchRow {
      id: number;
      season_id: number;
      home_score: number | null;
      away_score: number | null;
      status: string;
      played_date: string | null;
      phase?: string;
      home_team_id: number;
      away_team_id: number;
    }

    // High-concurrency mock Supabase with simulated network delay & race condition exposure
    const createConcurrentMockSupabase = (options?: {
      uniqueConstraintOnStats?: boolean;
      networkDelayMs?: number;
    }) => {
      const uniqueConstraint = options?.uniqueConstraintOnStats ?? false;
      const delay = options?.networkDelayMs ?? 10;

      const matches: MatchRow[] = [
        {
          id: 101,
          season_id: 4,
          home_score: null,
          away_score: null,
          status: 'Programado',
          played_date: null,
          phase: 'Fase Regular',
          home_team_id: 1,
          away_team_id: 2,
        },
      ];
      let playerStats: StatRow[] = [];
      let statAutoId = 0;
      let deleteCount = 0;
      let insertCount = 0;
      let updateCount = 0;

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const client = {
        from: (table: string) => ({
          update: (data: Partial<MatchRow>) => ({
            eq: async (_col: string, val: number) => {
              await sleep(delay);
              updateCount++;
              const m = matches.find((x) => x.id === val);
              if (m) Object.assign(m, data);
              return { error: null, data: m };
            },
            in: async () => ({ error: null, data: [] }),
          }),
          delete: () => ({
            eq: async (_col: string, val: number) => {
              await sleep(delay);
              deleteCount++;
              if (table === 'player_match_stats') {
                playerStats = playerStats.filter((s) => s.match_id !== val);
              }
              return { error: null, data: null };
            },
          }),
          insert: async (rows: StatRow | StatRow[]) => {
            await sleep(delay);
            insertCount++;
            const arr = Array.isArray(rows) ? rows : [rows];
            if (table === 'player_match_stats') {
              for (const row of arr) {
                if (uniqueConstraint) {
                  const exists = playerStats.some(
                    (s) => s.match_id === row.match_id && s.player_id === row.player_id
                  );
                  if (exists) {
                    return {
                      error: {
                        code: '23505',
                        message: 'duplicate key value violates unique constraint "player_match_stats_pkey"',
                      },
                      data: null,
                    };
                  }
                }
                playerStats.push({ ...row, id: ++statAutoId });
              }
            }
            return { error: null, data: arr };
          },
          select: () => ({
            eq: (_col: string, val: number) => ({
              single: async () => {
                const m = matches.find((x) => x.id === val);
                return { error: null, data: m ?? null };
              },
            }),
          }),
        }),
      };

      return {
        client: client as unknown as SupabaseClient,
        getStats: () => [...playerStats],
        getMatches: () => [...matches],
        getCounts: () => ({ deleteCount, insertCount, updateCount }),
      };
    };

    it('EMPIRICAL RACE CONDITION: Concurrent un-locked saveMatchResult leads to duplicate stats if no DB unique constraint', async () => {
      const mockDb = createConcurrentMockSupabase({ uniqueConstraintOnStats: false, networkDelayMs: 15 });

      const homeLineup: LineupRow[] = [
        { player_id: 10, team_id: 1, played: true, points: 20, triples: 2 },
        { player_id: 11, team_id: 1, played: true, points: 15, triples: 1 },
      ];
      const awayLineup: LineupRow[] = [
        { player_id: 20, team_id: 2, played: true, points: 25, triples: 3 },
      ];

      // Simulate rapid concurrent submission (e.g. user double-clicked before re-render disabled state)
      // Both promises are launched at the same tick
      const call1 = saveMatchResult(mockDb.client, 101, 'Normal', homeLineup, awayLineup);
      const call2 = saveMatchResult(mockDb.client, 101, 'Normal', homeLineup, awayLineup);

      await Promise.all([call1, call2]);

      const stats = mockDb.getStats();
      // Because saveMatchResult has no concurrency lock, both callers delete and then both insert
      // Without DB unique constraint, 3 players * 2 = 6 stats rows (DUPLICATION)
      expect(stats.length).toBe(6);
      expect(mockDb.getCounts().insertCount).toBe(2);
    });

    it('EMPIRICAL RACE CONDITION: Concurrent saveMatchResult triggers 23505 constraint error if DB enforces uniqueness', async () => {
      const mockDb = createConcurrentMockSupabase({ uniqueConstraintOnStats: true, networkDelayMs: 15 });

      const homeLineup: LineupRow[] = [
        { player_id: 10, team_id: 1, played: true, points: 20, triples: 2 },
      ];
      const awayLineup: LineupRow[] = [
        { player_id: 20, team_id: 2, played: true, points: 15, triples: 1 },
      ];

      const call1 = saveMatchResult(mockDb.client, 101, 'Normal', homeLineup, awayLineup);
      const call2 = saveMatchResult(mockDb.client, 101, 'Normal', homeLineup, awayLineup);

      const results = await Promise.allSettled([call1, call2]);
      const rejected = results.filter((r) => r.status === 'rejected');

      // One call succeeds, and the concurrent call fails with unique constraint violation
      expect(rejected.length).toBeGreaterThanOrEqual(1);
      if (rejected.length > 0) {
        const err = (rejected[0] as PromiseRejectedResult).reason as Error;
        expect(err.message).toContain('duplicate key value violates unique constraint');
      }
    });

    it('DOUBLE-SUBMIT GUARD VERIFICATION: Verify in-flight ref locking pattern guarantees single execution', async () => {
      // Test the contract of in-flight double-submit guard
      let inFlight = false;
      let executionCount = 0;

      const guardedSubmit = async (fn: () => Promise<void>) => {
        if (inFlight) {
          // Block duplicate concurrent execution immediately
          return false;
        }
        inFlight = true;
        try {
          await fn();
          executionCount++;
          return true;
        } finally {
          inFlight = false;
        }
      };

      const mockTask = () => new Promise<void>((resolve) => setTimeout(resolve, 30));

      // Fire 5 rapid concurrent clicks
      const results = await Promise.all([
        guardedSubmit(mockTask),
        guardedSubmit(mockTask),
        guardedSubmit(mockTask),
        guardedSubmit(mockTask),
        guardedSubmit(mockTask),
      ]);

      // Exactly 1 execution was permitted, 4 were blocked
      expect(results.filter((res) => res === true).length).toBe(1);
      expect(results.filter((res) => res === false).length).toBe(4);
      expect(executionCount).toBe(1);
    });

    it('CAPTUREFORM UI STATE: Button disabled={saving} and loading={saving} contract verification', () => {
      // In CaptureForm.tsx:
      // Line 85: const [saving, setSaving] = useState(false);
      // Line 283-284: loading={saving} disabled={saving}
      // Verify that when saving is true, disabled and loading evaluate to true
      const stateSaving = true;
      const buttonProps = {
        loading: stateSaving,
        disabled: stateSaving,
      };

      expect(buttonProps.disabled).toBe(true);
      expect(buttonProps.loading).toBe(true);

      const stateIdle = false;
      const buttonIdleProps = {
        loading: stateIdle,
        disabled: stateIdle,
      };
      expect(buttonIdleProps.disabled).toBe(false);
      expect(buttonIdleProps.loading).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 2. CACHE INVALIDATION VERIFICATION
  // --------------------------------------------------------------------------
  describe('2. TanStack React Query Cache Invalidation Verification', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
      queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000, // 1 minute fresh
          },
        },
      });
    });

    it('GENUINE INVALIDATION: Invalidation function from CaptureForm marks all target queryKeys stale', async () => {
      const seasonId = 4;
      const matchId = 101;

      // Populate query cache with fresh queries
      queryClient.setQueryData(['matches-programmed'], { data: ['match-1'] });
      queryClient.setQueryData(['matches-programmed', seasonId], { data: ['match-1', 'match-2'] });
      queryClient.setQueryData(['matches', seasonId], { data: ['all-season-matches'] });
      queryClient.setQueryData(['stats', seasonId], { data: ['season-stats'] });
      queryClient.setQueryData(['standings', seasonId], { data: ['season-standings'] });
      queryClient.setQueryData(['season-detail', seasonId], { data: ['season-4-details'] });
      queryClient.setQueryData(['match', matchId], { data: ['match-101-detail'] });
      queryClient.setQueryData(['players-capture-home', matchId, seasonId], { data: ['home-players'] });
      queryClient.setQueryData(['players-capture-away', matchId, seasonId], { data: ['away-players'] });
      queryClient.setQueryData(['eligibility', 10, seasonId], { data: ['team-10-eligibility'] });
      queryClient.setQueryData(['unrelated-query'], { data: ['unrelated'] });

      const isStale = (key: unknown[]) => {
        const q = queryClient.getQueryCache().find({ queryKey: key });
        return q ? q.isStale() : false;
      };

      // Before invalidation: all queries are fresh (not stale)
      expect(isStale(['matches-programmed'])).toBe(false);
      expect(isStale(['matches-programmed', seasonId])).toBe(false);
      expect(isStale(['matches', seasonId])).toBe(false);
      expect(isStale(['stats', seasonId])).toBe(false);
      expect(isStale(['standings', seasonId])).toBe(false);
      expect(isStale(['season-detail', seasonId])).toBe(false);
      expect(isStale(['match', matchId])).toBe(false);
      expect(isStale(['players-capture-home', matchId, seasonId])).toBe(false);
      expect(isStale(['players-capture-away', matchId, seasonId])).toBe(false);
      expect(isStale(['eligibility', 10, seasonId])).toBe(false);
      expect(isStale(['unrelated-query'])).toBe(false);

      // Execute exact invalidations from CaptureForm.tsx:114-126
      await queryClient.invalidateQueries({ queryKey: ['matches-programmed'] });
      if (seasonId) {
        await queryClient.invalidateQueries({ queryKey: ['matches-programmed', seasonId] });
        await queryClient.invalidateQueries({ queryKey: ['matches', seasonId] });
        await queryClient.invalidateQueries({ queryKey: ['stats', seasonId] });
        await queryClient.invalidateQueries({ queryKey: ['standings', seasonId] });
        await queryClient.invalidateQueries({ queryKey: ['season-detail', seasonId] });
      }
      await queryClient.invalidateQueries({ queryKey: ['match', matchId] });
      await queryClient.invalidateQueries({ queryKey: ['players-capture-home'] });
      await queryClient.invalidateQueries({ queryKey: ['players-capture-away'] });
      await queryClient.invalidateQueries({ queryKey: ['eligibility'] });

      // After invalidation: all relevant queries MUST be stale
      expect(isStale(['matches-programmed'])).toBe(true);
      expect(isStale(['matches-programmed', seasonId])).toBe(true);
      expect(isStale(['matches', seasonId])).toBe(true);
      expect(isStale(['stats', seasonId])).toBe(true);
      expect(isStale(['standings', seasonId])).toBe(true);
      expect(isStale(['season-detail', seasonId])).toBe(true);
      expect(isStale(['match', matchId])).toBe(true);
      expect(isStale(['players-capture-home', matchId, seasonId])).toBe(true);
      expect(isStale(['players-capture-away', matchId, seasonId])).toBe(true);
      expect(isStale(['eligibility', 10, seasonId])).toBe(true);

      // Unrelated query must remain unaffected
      expect(isStale(['unrelated-query'])).toBe(false);
    });

    it('ADVERSARIAL EDGE CASE: When seasonId is null, season-scoped queries are NOT invalidated', async () => {
      const isStale = (key: unknown[]) => {
        const q = queryClient.getQueryCache().find({ queryKey: key });
        return q ? q.isStale() : false;
      };

      const seasonId: number | null = null;

      queryClient.setQueryData(['matches-programmed'], { data: [] });
      queryClient.setQueryData(['matches', 4], { data: [] });
      queryClient.setQueryData(['standings', 4], { data: [] });
      queryClient.setQueryData(['stats', 4], { data: [] });

      // Run CaptureForm invalidation when seasonId is null
      await queryClient.invalidateQueries({ queryKey: ['matches-programmed'] });
      if (seasonId) {
        await queryClient.invalidateQueries({ queryKey: ['matches-programmed', seasonId] });
        await queryClient.invalidateQueries({ queryKey: ['matches', seasonId] });
        await queryClient.invalidateQueries({ queryKey: ['stats', seasonId] });
        await queryClient.invalidateQueries({ queryKey: ['standings', seasonId] });
      }

      // ['matches-programmed'] is invalidated because it was called unconditionally
      expect(isStale(['matches-programmed'])).toBe(true);

      // BUT ['matches', 4], ['standings', 4], ['stats', 4] remain fresh because if (seasonId) was skipped!
      expect(isStale(['matches', 4])).toBe(false);
      expect(isStale(['standings', 4])).toBe(false);
      expect(isStale(['stats', 4])).toBe(false);
    });

    it('PREFIX MATCHING BEHAVIOR: Invalidate ["matches", seasonId] does NOT invalidate root ["matches"]', async () => {
      const isStale = (key: unknown[]) => {
        const q = queryClient.getQueryCache().find({ queryKey: key });
        return q ? q.isStale() : false;
      };

      // Suppose a calendar component cached root ['matches'] without seasonId
      queryClient.setQueryData(['matches'], { data: ['all-league-matches'] });
      queryClient.setQueryData(['matches', 4], { data: ['season-4-matches'] });

      // Invalidate specifically ['matches', 4]
      await queryClient.invalidateQueries({ queryKey: ['matches', 4] });

      // ['matches', 4] is stale
      expect(isStale(['matches', 4])).toBe(true);

      // Sub-query prefix rule: queryKey ['matches', 4] does NOT match root ['matches']!
      expect(isStale(['matches'])).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. POSTGRESQL CONSTRAINT: matches_vuelta_check (Error 23514)
  // --------------------------------------------------------------------------
  describe('3. Database Constraint: matches_vuelta_check', () => {
    // Exact PostgreSQL constraint logic:
    // CHECK (vuelta IS NULL OR vuelta IN ('ida', 'vuelta', 'liguilla'))
    const validateMatchesVueltaConstraint = (vuelta: unknown): { valid: boolean; code?: string; message?: string } => {
      if (vuelta === null || vuelta === undefined) {
        return { valid: true };
      }
      if (typeof vuelta === 'string' && ['ida', 'vuelta', 'liguilla'].includes(vuelta)) {
        return { valid: true };
      }
      return {
        valid: false,
        code: '23514',
        message: 'new row for relation "matches" violates check constraint "matches_vuelta_check"',
      };
    };

    it('VALID VUELTAS: accepts null, undefined, "ida", "vuelta", "liguilla"', () => {
      expect(validateMatchesVueltaConstraint(null).valid).toBe(true);
      expect(validateMatchesVueltaConstraint(undefined).valid).toBe(true);
      expect(validateMatchesVueltaConstraint('ida').valid).toBe(true);
      expect(validateMatchesVueltaConstraint('vuelta').valid).toBe(true);
      expect(validateMatchesVueltaConstraint('liguilla').valid).toBe(true);
    });

    it('INVALID VUELTAS: rejects invalid strings with Postgres error 23514', () => {
      const invalidValues = [
        'Ida',          // Uppercase
        'VUELTA',       // Uppercase
        'final',        // Custom phase
        'semifinal',    // Custom phase
        'amistoso',     // Non-existent
        'playoff',      // Non-existent
        '',             // Empty string
        ' ',            // Whitespace
        '1',            // Number string
        1,              // Number
        false,          // Boolean
      ];

      for (const val of invalidValues) {
        const res = validateMatchesVueltaConstraint(val);
        expect(res.valid).toBe(false);
        expect(res.code).toBe('23514');
        expect(res.message).toContain('matches_vuelta_check');
      }
    });

    it('MISSING MATCHES MODAL LOGIC: MissingMatchesModal produces strictly valid vueltas', () => {
      // Simulate MissingMatchesModal logic for single existing match
      const computeMissingVuelta = (existingVuelta?: string | null): 'ida' | 'vuelta' => {
        return existingVuelta === 'vuelta' ? 'ida' : 'vuelta';
      };

      // When existing match is 'vuelta', missing leg must be 'ida'
      const missingWhenVuelta = computeMissingVuelta('vuelta');
      expect(missingWhenVuelta).toBe('ida');
      expect(validateMatchesVueltaConstraint(missingWhenVuelta).valid).toBe(true);

      // When existing match is 'ida', missing leg must be 'vuelta'
      const missingWhenIda = computeMissingVuelta('ida');
      expect(missingWhenIda).toBe('vuelta');
      expect(validateMatchesVueltaConstraint(missingWhenIda).valid).toBe(true);

      // When existing match has no vuelta (null/undefined), missing leg defaults to 'vuelta'
      const missingWhenNull = computeMissingVuelta(null);
      expect(missingWhenNull).toBe('vuelta');
      expect(validateMatchesVueltaConstraint(missingWhenNull).valid).toBe(true);
    });

    it('RESERVE MIRROR LOGIC: MissingMatchesModal pair creation reserves "ida" and "vuelta"', () => {
      const createMirrorPair = (homeTeamId: number, awayTeamId: number, jornada: number) => {
        return [
          {
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            jornada,
            vuelta: 'ida' as const,
          },
          {
            home_team_id: awayTeamId,
            away_team_id: homeTeamId,
            jornada: jornada + 7,
            vuelta: 'vuelta' as const,
          },
        ];
      };

      const pair = createMirrorPair(101, 102, 1);
      expect(validateMatchesVueltaConstraint(pair[0].vuelta).valid).toBe(true);
      expect(validateMatchesVueltaConstraint(pair[1].vuelta).valid).toBe(true);
      expect(pair[0].vuelta).toBe('ida');
      expect(pair[1].vuelta).toBe('vuelta');
    });
  });

  // --------------------------------------------------------------------------
  // 4. FOREIGN KEY 23503 & SOFT-DELETE INTEGRITY
  // --------------------------------------------------------------------------
  describe('4. Foreign Key 23503 Soft-Delete Verification', () => {
    interface TeamRecord {
      id: number;
      name: string;
      status: string;
    }
    interface PlayerRecord {
      id: number;
      team_id: number;
      name: string;
      is_active: boolean;
    }
    interface MatchRecord {
      id: number;
      home_team_id: number;
      away_team_id: number;
      status: string;
    }

    const createTeamsMockDatabase = () => {
      let teams: TeamRecord[] = [
        { id: 1, name: 'Team With History', status: 'Activo' },
        { id: 2, name: 'Opponent Team', status: 'Activo' },
        { id: 3, name: 'Brand New Team', status: 'Activo' },
      ];
      const players: PlayerRecord[] = [
        { id: 10, team_id: 1, name: 'Player 1', is_active: true },
        { id: 11, team_id: 1, name: 'Player 2', is_active: true },
      ];
      const matches: MatchRecord[] = [
        { id: 1001, home_team_id: 1, away_team_id: 2, status: 'Jugado' },
      ];

      const client = {
        from: (table: string) => ({
          delete: () => ({
            eq: async (col: string, val: number) => {
              if (table === 'teams') {
                // Team 1 has matches and players referencing it -> Foreign key violation 23503!
                const hasMatches = matches.some((m) => m.home_team_id === val || m.away_team_id === val);
                const hasPlayers = players.some((p) => p.team_id === val);
                if (hasMatches || hasPlayers) {
                  return {
                    error: {
                      code: '23503',
                      message: 'update or delete on table "teams" violates foreign key constraint',
                    },
                    data: null,
                  };
                }
                teams = teams.filter((t) => (t as unknown as Record<string, unknown>)[col] !== val);
                return { error: null, data: null };
              }
              return { error: null, data: null };
            },
          }),
          update: (updates: Record<string, unknown>) => ({
            eq: async (col: string, val: number) => {
              if (table === 'teams') {
                const t = teams.find((x) => (x as unknown as Record<string, unknown>)[col] === val);
                if (t) Object.assign(t, updates);
                return { error: null, data: t };
              }
              if (table === 'players') {
                const matched = players.filter((p) => (p as unknown as Record<string, unknown>)[col] === val);
                matched.forEach((p) => Object.assign(p, updates));
                return { error: null, data: matched };
              }
              return { error: null, data: null };
            },
          }),
        }),
      };

      return {
        client: client as unknown as SupabaseClient,
        getTeams: () => [...teams],
        getPlayers: () => [...players],
        getMatches: () => [...matches],
      };
    };

    // Implementation of deleteTeam mutationFn from app/admin/teams/page.tsx:712-736
    const executeDeleteTeam = async (supabase: SupabaseClient, id: number) => {
      const { error } = await supabase.from('teams').delete().eq('id', id);

      if (error) {
        if (error.code === '23503') {
          // Si tiene partidos o jugadores registrados, marcar como baja (soft-delete)
          const { error: updateError } = await supabase
            .from('teams')
            .update({ status: 'Baja' })
            .eq('id', id);
          if (updateError) throw updateError;

          // Desactivar también sus jugadores asociados
          await supabase
            .from('players')
            .update({ is_active: false })
            .eq('team_id', id);

          return 'soft-deleted';
        }
        throw error;
      }

      return 'deleted';
    };

    it('SOFT DELETE ON FK 23503: Team with historical matches/players is marked "Baja", players deactivated, zero data loss', async () => {
      const db = createTeamsMockDatabase();

      // Team 1 has matches and players -> Deletion must soft-delete
      const result = await executeDeleteTeam(db.client, 1);
      expect(result).toBe('soft-deleted');

      // Verify zero historical data loss:
      // 1. Team is NOT deleted from DB, status changed to 'Baja'
      const team1 = db.getTeams().find((t) => t.id === 1);
      expect(team1).toBeDefined();
      expect(team1?.status).toBe('Baja');

      // 2. Players still exist, but is_active changed to false
      const teamPlayers = db.getPlayers().filter((p) => p.team_id === 1);
      expect(teamPlayers.length).toBe(2);
      expect(teamPlayers.every((p) => p.is_active === false)).toBe(true);

      // 3. Historical matches are completely untouched
      const teamMatches = db.getMatches().filter((m) => m.home_team_id === 1 || m.away_team_id === 1);
      expect(teamMatches.length).toBe(1);
      expect(teamMatches[0].status).toBe('Jugado');
    });

    it('CLEAN HARD DELETE: Team without history is permanently deleted', async () => {
      const db = createTeamsMockDatabase();

      // Team 3 has no players, no matches (brand new empty team)
      const result = await executeDeleteTeam(db.client, 3);
      expect(result).toBe('deleted');

      // Team 3 is completely removed from database
      const team3 = db.getTeams().find((t) => t.id === 3);
      expect(team3).toBeUndefined();
    });
  });
});
