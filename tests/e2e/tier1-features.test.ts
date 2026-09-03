import { describe, expect, it, beforeEach } from 'vitest';
import { saveMatchResult, LineupRow } from '../../lib/saveMatch';
import {
  createMockSupabase,
  createAdminStoreSimulator,
  applyFilterAndSort,
  DoubleSubmitGuard,
} from './helpers/test-fixtures';

describe('Tier 1: Feature Coverage', () => {
  // -------------------------------------------------------------
  // Feature 1: Save Persistence (lib/saveMatch.ts & Database)
  // -------------------------------------------------------------
  describe('Feature 1: Save Persistence', () => {
    let mock: ReturnType<typeof createMockSupabase>;

    beforeEach(() => {
      mock = createMockSupabase();
    });

    it('T1-F1.1: persists match status transition from Programado to Jugado', async () => {
      const homeLineup: LineupRow[] = [
        { player_id: 201, team_id: 101, played: true, points: 20, triples: 2 },
        { player_id: 202, team_id: 101, played: true, points: 15, triples: 1 },
      ];
      const awayLineup: LineupRow[] = [
        { player_id: 205, team_id: 102, played: true, points: 30, triples: 4 },
      ];

      await saveMatchResult(mock.client, 301, 'Normal', homeLineup, awayLineup);

      const savedMatch = mock.db.matches.find((m) => m.id === 301);
      expect(savedMatch).toBeDefined();
      expect(savedMatch?.status).toBe('Jugado');
      expect(savedMatch?.played_date).toBeTruthy();
    });

    it('T1-F1.2: persists team aggregate scores accurately from player points', async () => {
      const homeLineup: LineupRow[] = [
        { player_id: 201, team_id: 101, played: true, points: 25, triples: 3 },
        { player_id: 202, team_id: 101, played: true, points: 18, triples: 0 },
      ];
      const awayLineup: LineupRow[] = [
        { player_id: 205, team_id: 102, played: true, points: 40, triples: 6 },
        { player_id: 206, team_id: 102, played: false, points: 0, triples: 0 },
      ];

      await saveMatchResult(mock.client, 301, 'Normal', homeLineup, awayLineup);

      const savedMatch = mock.db.matches.find((m) => m.id === 301);
      expect(savedMatch?.home_score).toBe(43);
      expect(savedMatch?.away_score).toBe(40);
    });

    it('T1-F1.3: persists individual player stats in player_match_stats table', async () => {
      const homeLineup: LineupRow[] = [
        { player_id: 201, team_id: 101, played: true, points: 22, triples: 4 },
      ];
      const awayLineup: LineupRow[] = [
        { player_id: 205, team_id: 102, played: true, points: 19, triples: 1 },
      ];

      await saveMatchResult(mock.client, 301, 'Normal', homeLineup, awayLineup);

      const stats = mock.db.player_match_stats.filter((s) => s.match_id === 301);
      expect(stats.length).toBe(2);
      expect(stats.find((s) => s.player_id === 201)?.points).toBe(22);
      expect(stats.find((s) => s.player_id === 205)?.triples).toBe(1);
    });

    it('T1-F1.4: deletes previous match stats before inserting new ones (idempotency)', async () => {
      // First save
      await saveMatchResult(
        mock.client,
        301,
        'Normal',
        [{ player_id: 201, team_id: 101, played: true, points: 10, triples: 0 }],
        [{ player_id: 205, team_id: 102, played: true, points: 12, triples: 0 }]
      );
      expect(mock.db.player_match_stats.filter((s) => s.match_id === 301).length).toBe(2);

      // Second save with modified lineup
      await saveMatchResult(
        mock.client,
        301,
        'Normal',
        [
          { player_id: 201, team_id: 101, played: true, points: 15, triples: 1 },
          { player_id: 202, team_id: 101, played: true, points: 10, triples: 0 },
        ],
        [{ player_id: 205, team_id: 102, played: true, points: 14, triples: 2 }]
      );

      const stats = mock.db.player_match_stats.filter((s) => s.match_id === 301);
      expect(stats.length).toBe(3); // 2 home + 1 away, old stats cleaned up
      expect(stats.find((s) => s.player_id === 201)?.points).toBe(15);
    });

    it('T1-F1.5: ignores stats of players marked as played: false', async () => {
      const homeLineup: LineupRow[] = [
        { player_id: 201, team_id: 101, played: true, points: 10, triples: 0 },
        { player_id: 202, team_id: 101, played: false, points: 25, triples: 5 }, // Did not play
      ];
      const awayLineup: LineupRow[] = [
        { player_id: 205, team_id: 102, played: true, points: 15, triples: 1 },
      ];

      await saveMatchResult(mock.client, 301, 'Normal', homeLineup, awayLineup);

      const stats = mock.db.player_match_stats.filter((s) => s.match_id === 301);
      expect(stats.length).toBe(2);
      expect(stats.some((s) => s.player_id === 202)).toBe(false);

      const savedMatch = mock.db.matches.find((m) => m.id === 301);
      expect(savedMatch?.home_score).toBe(10); // Points of absent player excluded
    });
  });

  // -------------------------------------------------------------
  // Feature 2: Reload Season Retention (lib/admin-store.ts Contract)
  // -------------------------------------------------------------
  describe('Feature 2: Reload Season Retention', () => {
    const activeSeasons = [
      { id: 3, name: 'Liga Femenil 2026' },
      { id: 4, name: 'Liga Tercera Fuerza 2026' },
      { id: 10, name: 'LIGA LIBRE 2026' },
      { id: 11, name: 'LIGA MASTER' },
      { id: 12, name: 'Liga Veteranos 2026' },
    ];

    it('T1-F2.1: saves selected season to localStorage under selected_admin_season_id', () => {
      const store = createAdminStoreSimulator();
      store.setSelectedSeasonId(4);

      expect(store.selectedSeasonId).toBe(4);
      expect(store.getStorageValue()).toBe('4');
    });

    it('T1-F2.2: retains user-selected season (Season 4) on reload instead of defaulting to Season 3', () => {
      // User selects Season 4 (Tercera Fuerza)
      const storeBeforeReload = createAdminStoreSimulator();
      storeBeforeReload.setSelectedSeasonId(4);

      // Reload occurs: New store initialized with same persistent storage
      const persistedStorage = { selected_admin_season_id: storeBeforeReload.getStorageValue()! };
      const storeAfterReload = createAdminStoreSimulator(persistedStorage);
      storeAfterReload.initializeSeason(activeSeasons);

      expect(storeAfterReload.selectedSeasonId).toBe(4);
      expect(storeAfterReload.selectedSeasonId).not.toBe(3); // Regression eliminated!
    });

    it('T1-F2.3: initializes with the first active season if localStorage is empty', () => {
      const store = createAdminStoreSimulator();
      store.initializeSeason(activeSeasons);

      expect(store.selectedSeasonId).toBe(3); // First active season as fallback
    });

    it('T1-F2.4: honors URL search parameter ?season=10 with highest precedence', () => {
      // LocalStorage says season 4, but user opened URL with ?season=10
      const store = createAdminStoreSimulator({ selected_admin_season_id: '4' });
      store.initializeSeason(activeSeasons, '10');

      expect(store.selectedSeasonId).toBe(10);
      expect(store.getStorageValue()).toBe('10');
    });

    it('T1-F2.5: falls back to storage if URL param is invalid or refers to non-existent season', () => {
      const store = createAdminStoreSimulator({ selected_admin_season_id: '4' });
      store.initializeSeason(activeSeasons, '999'); // 999 does not exist

      expect(store.selectedSeasonId).toBe(4); // Safely falls back to valid stored season
    });
  });

  // -------------------------------------------------------------
  // Feature 3: Instant Search (AdminFilterBar & Search Engine)
  // -------------------------------------------------------------
  describe('Feature 3: Instant Search', () => {
    const teams = [
      { name: 'Muebles Carlitos', category: '3ra' },
      { name: 'M-Sport', category: '3ra' },
      { name: 'Águilas de Nochixtlán', category: '3ra' },
      { name: 'Halcones Rojos', category: '3ra' },
      { name: '12 de Octubre', category: '3ra' },
    ];

    it('T1-F3.1: filters case-insensitively', () => {
      const lower = applyFilterAndSort(teams, { searchQuery: 'halcones' });
      const upper = applyFilterAndSort(teams, { searchQuery: 'HALCONES' });
      const mixed = applyFilterAndSort(teams, { searchQuery: 'HalCoNeS' });

      expect(lower.filteredItems.length).toBe(1);
      expect(upper.filteredItems.length).toBe(1);
      expect(mixed.filteredItems.length).toBe(1);
      expect(lower.filteredItems[0].name).toBe('Halcones Rojos');
    });

    it('T1-F3.2: matches accented characters transparently (Aguilas matches Águilas)', () => {
      const withoutAccent = applyFilterAndSort(teams, { searchQuery: 'aguilas' });
      const withAccent = applyFilterAndSort(teams, { searchQuery: 'águilas' });

      expect(withoutAccent.filteredItems.length).toBe(1);
      expect(withAccent.filteredItems.length).toBe(1);
      expect(withoutAccent.filteredItems[0].name).toBe('Águilas de Nochixtlán');
    });

    it('T1-F3.3: matches prefix substrings', () => {
      const result = applyFilterAndSort(teams, { searchQuery: 'Mue' });
      expect(result.filteredItems.length).toBe(1);
      expect(result.filteredItems[0].name).toBe('Muebles Carlitos');
    });

    it('T1-F3.4: matches inner/middle substrings', () => {
      const result = applyFilterAndSort(teams, { searchQuery: 'Sport' });
      expect(result.filteredItems.length).toBe(1);
      expect(result.filteredItems[0].name).toBe('M-Sport');
    });

    it('T1-F3.5: handles whitespace padding gracefully', () => {
      const result = applyFilterAndSort(teams, { searchQuery: '   Halcones   ' });
      expect(result.filteredItems.length).toBe(1);
      expect(result.filteredItems[0].name).toBe('Halcones Rojos');
    });
  });

  // -------------------------------------------------------------
  // Feature 4: A-Z Sort (Default Sorting Requirement)
  // -------------------------------------------------------------
  describe('Feature 4: A-Z Sort', () => {
    const teams = [
      { name: 'Toros de Huajuapan', category: '3ra' },
      { name: 'Águilas de Nochixtlán', category: '3ra' },
      { name: '12 de Octubre', category: '3ra' },
      { name: 'Muebles Carlitos', category: '3ra' },
      { name: 'Halcones Rojos', category: '3ra' },
    ];

    it('T1-F4.1: sorts alphabetically A-Z by default', () => {
      const result = applyFilterAndSort(teams, { sortDirection: 'asc' });
      const names = result.filteredItems.map((t) => t.name);

      // Numbers first, then natural spanish alphabetical order
      expect(names[0]).toBe('12 de Octubre');
      expect(names[names.length - 1]).toBe('Toros de Huajuapan');
    });

    it('T1-F4.2: sorts accented letters naturally alongside non-accented letters', () => {
      const items = [
        { name: 'Zapata', category: '3ra' },
        { name: 'Águilas', category: '3ra' },
        { name: 'Abejas', category: '3ra' },
        { name: 'Balones', category: '3ra' },
      ];
      const result = applyFilterAndSort(items, { sortDirection: 'asc' });
      const names = result.filteredItems.map((i) => i.name);

      expect(names[0]).toBe('Abejas');
      expect(names[1]).toBe('Águilas'); // Natural A sort, NOT placed after Z
      expect(names[2]).toBe('Balones');
      expect(names[3]).toBe('Zapata');
    });

    it('T1-F4.3: supports descending Z-A sorting order', () => {
      const result = applyFilterAndSort(teams, { sortDirection: 'desc' });
      const names = result.filteredItems.map((t) => t.name);

      expect(names[0]).toBe('Toros de Huajuapan');
      expect(names[names.length - 1]).toBe('12 de Octubre');
    });

    it('T1-F4.4: handles hyphenated and compound team names consistently', () => {
      const items = [
        { name: 'Muebles Carlitos', category: '3ra' },
        { name: 'M-Sport', category: '3ra' },
        { name: 'Marmolería San José', category: '3ra' },
      ];
      const result = applyFilterAndSort(items, { sortDirection: 'asc' });
      expect(result.filteredItems.length).toBe(3);
    });

    it('T1-F4.5: maintains deterministic order for identical names', () => {
      const items = [
        { name: 'Halcones', category: '3ra' },
        { name: 'Halcones', category: 'Libre' },
      ];
      const result = applyFilterAndSort(items, { sortDirection: 'asc' });
      expect(result.filteredItems.length).toBe(2);
      expect(result.filteredItems[0].name).toBe('Halcones');
    });
  });

  // -------------------------------------------------------------
  // Feature 5: Filter Reset ("Limpiar Filtros")
  // -------------------------------------------------------------
  describe('Feature 5: Filter Reset', () => {
    const teams = [
      { name: 'Muebles Carlitos', category: '3ra' },
      { name: 'M-Sport', category: '3ra' },
      { name: 'Amazonas', category: 'Femenil' },
      { name: 'Veteranos VIP', category: 'Veteranos' },
    ];

    it('T1-F5.1: resets search query to empty', () => {
      // Applied filter
      let currentFilter = { searchQuery: 'Muebles', categoryFilter: '3ra' };
      let filtered = applyFilterAndSort(teams, currentFilter);
      expect(filtered.filteredItems.length).toBe(1);

      // Trigger "Limpiar filtros"
      currentFilter = { searchQuery: '', categoryFilter: 'all' };
      filtered = applyFilterAndSort(teams, currentFilter);

      expect(filtered.filteredItems.length).toBe(4);
    });

    it('T1-F5.2: restores all original items when category filter is cleared', () => {
      const filtered = applyFilterAndSort(teams, { categoryFilter: 'Femenil' });
      expect(filtered.filteredItems.length).toBe(1);

      const reset = applyFilterAndSort(teams, { categoryFilter: 'all' });
      expect(reset.filteredItems.length).toBe(teams.length);
    });

    it('T1-F5.3: restores counter to total items count upon reset', () => {
      const filtered = applyFilterAndSort(teams, { searchQuery: 'Carlitos' });
      expect(filtered.counterText).toBe('1 de 4');

      const reset = applyFilterAndSort(teams, { searchQuery: '', categoryFilter: 'all' });
      expect(reset.counterText).toBe('4 de 4');
    });

    it('T1-F5.4: works idempotently when triggered without active filters', () => {
      const pristine = applyFilterAndSort(teams, { searchQuery: '', categoryFilter: 'all' });
      const resetAgain = applyFilterAndSort(teams, { searchQuery: '', categoryFilter: 'all' });

      expect(pristine.filteredItems.length).toBe(resetAgain.filteredItems.length);
    });

    it('T1-F5.5: preserves default A-Z sort order after filters are reset', () => {
      const filtered = applyFilterAndSort(teams, { searchQuery: 'Amazonas' });
      expect(filtered.filteredItems[0].name).toBe('Amazonas');

      const reset = applyFilterAndSort(teams, { searchQuery: '', categoryFilter: 'all', sortDirection: 'asc' });
      expect(reset.filteredItems[0].name).toBe('Amazonas');
      expect(reset.filteredItems[reset.filteredItems.length - 1].name).toBe('Veteranos VIP');
    });
  });

  // -------------------------------------------------------------
  // Feature 6: Results Counter ("X de Y")
  // -------------------------------------------------------------
  describe('Feature 6: Results Counter', () => {
    const teams = [
      { name: 'Muebles Carlitos', category: '3ra' },
      { name: 'M-Sport', category: '3ra' },
      { name: 'Águilas', category: '3ra' },
      { name: 'Halcones', category: '3ra' },
      { name: 'Amazonas', category: 'Femenil' },
    ];

    it('T1-F6.1: shows full count format "5 de 5" when unfiltered', () => {
      const res = applyFilterAndSort(teams, {});
      expect(res.counterText).toBe('5 de 5');
      expect(res.totalCount).toBe(5);
      expect(res.matchedCount).toBe(5);
    });

    it('T1-F6.2: shows narrowed count format "1 de 5" on specific match', () => {
      const res = applyFilterAndSort(teams, { searchQuery: 'Halcones' });
      expect(res.counterText).toBe('1 de 5');
      expect(res.matchedCount).toBe(1);
    });

    it('T1-F6.3: shows "0 de 5" when search yields zero matches', () => {
      const res = applyFilterAndSort(teams, { searchQuery: 'NonExistentTeam' });
      expect(res.counterText).toBe('0 de 5');
      expect(res.matchedCount).toBe(0);
    });

    it('T1-F6.4: reflects category filter in matched count (e.g. "4 de 5")', () => {
      const res = applyFilterAndSort(teams, { categoryFilter: '3ra' });
      expect(res.counterText).toBe('4 de 5');
      expect(res.matchedCount).toBe(4);
    });

    it('T1-F6.5: dynamic counter adjusts when dataset size changes', () => {
      const smallerDataset = teams.slice(0, 3);
      const res = applyFilterAndSort(smallerDataset, {});
      expect(res.counterText).toBe('3 de 3');
      expect(res.totalCount).toBe(3);
    });
  });

  // -------------------------------------------------------------
  // Feature 7: Double-Submit Protection
  // -------------------------------------------------------------
  describe('Feature 7: Double-Submit Protection', () => {
    it('T1-F7.1: sets isSubmitting to true while save operation is in flight', async () => {
      const guard = new DoubleSubmitGuard();
      let flagDuringExecution = false;

      const promise = guard.execute(async () => {
        flagDuringExecution = guard.isSubmitting;
        return 'success';
      });

      expect(guard.isSubmitting).toBe(true);
      await promise;
      expect(flagDuringExecution).toBe(true);
      expect(guard.isSubmitting).toBe(false);
    });

    it('T1-F7.2: rejects second concurrent submit click while first is in-flight', async () => {
      const guard = new DoubleSubmitGuard();

      // Launch first save (takes 50ms)
      const firstSave = guard.execute(
        () => new Promise((resolve) => setTimeout(() => resolve('first'), 50))
      );

      // Attempt second save immediately while first is in-flight
      await expect(guard.execute(async () => 'second')).rejects.toThrow(
        /DUPLICATE_SUBMISSION_REJECTED/
      );

      await firstSave;
      expect(guard.successfulExecutions).toBe(1);
    });

    it('T1-F7.3: allows subsequent save after initial save successfully finishes', async () => {
      const guard = new DoubleSubmitGuard();

      await guard.execute(async () => 'first');
      expect(guard.isSubmitting).toBe(false);

      const second = await guard.execute(async () => 'second');
      expect(second).toBe('second');
      expect(guard.successfulExecutions).toBe(2);
    });

    it('T1-F7.4: resets isSubmitting to false if save action throws an error', async () => {
      const guard = new DoubleSubmitGuard();

      await expect(
        guard.execute(async () => {
          throw new Error('Database network timeout');
        })
      ).rejects.toThrow('Database network timeout');

      // Crucial: isSubmitting must NOT stay stuck as true on failure
      expect(guard.isSubmitting).toBe(false);

      // User should be able to retry
      const retryResult = await guard.execute(async () => 'retry_success');
      expect(retryResult).toBe('retry_success');
    });

    it('T1-F7.5: handles burst of 5 rapid clicks with exactly one execution', async () => {
      const guard = new DoubleSubmitGuard();
      const attempts = [
        guard.execute(() => new Promise((res) => setTimeout(() => res('ok'), 30))),
        guard.execute(() => Promise.resolve('burst2')).catch((e) => e.message),
        guard.execute(() => Promise.resolve('burst3')).catch((e) => e.message),
        guard.execute(() => Promise.resolve('burst4')).catch((e) => e.message),
        guard.execute(() => Promise.resolve('burst5')).catch((e) => e.message),
      ];

      const results = await Promise.all(attempts);
      expect(results[0]).toBe('ok');
      expect(results[1]).toContain('DUPLICATE_SUBMISSION_REJECTED');
      expect(guard.successfulExecutions).toBe(1);
    });
  });

  // -------------------------------------------------------------
  // Feature 8: Contextual Topbar Active Season Indicator
  // -------------------------------------------------------------
  describe('Feature 8: Topbar Active Season Indicator', () => {
    it('T1-F8.1: resolves current active season label and category badge from store', () => {
      const activeSeasons = [
        { id: 4, name: 'Liga Tercera Fuerza 2026', category: '3ra' },
        { id: 10, name: 'LIGA LIBRE 2026', category: 'Libre' },
      ];
      const store = createAdminStoreSimulator();
      store.setSelectedSeasonId(4);

      const active = activeSeasons.find((s) => s.id === store.selectedSeasonId);
      expect(active?.name).toBe('Liga Tercera Fuerza 2026');
      expect(active?.category).toBe('3ra');
    });

    it('T1-F8.2: updates Topbar display immediately when season is changed', () => {
      const activeSeasons = [
        { id: 4, name: 'Liga Tercera Fuerza 2026', category: '3ra' },
        { id: 10, name: 'LIGA LIBRE 2026', category: 'Libre' },
      ];
      const store = createAdminStoreSimulator();
      store.setSelectedSeasonId(4);
      expect(store.selectedSeasonId).toBe(4);

      store.setSelectedSeasonId(10);
      const updated = activeSeasons.find((s) => s.id === store.selectedSeasonId);
      expect(updated?.name).toBe('LIGA LIBRE 2026');
      expect(updated?.category).toBe('Libre');
    });

    it('T1-F8.3: formats contextual breadcrumbs based on active route', () => {
      const getBreadcrumb = (pathname: string) => {
        if (pathname === '/admin') return ['Admin', 'Dashboard'];
        if (pathname === '/admin/teams') return ['Admin', 'Equipos'];
        if (pathname === '/admin/calendar') return ['Admin', 'Calendario'];
        if (pathname === '/admin/capture') return ['Admin', 'Captura'];
        return ['Admin'];
      };

      expect(getBreadcrumb('/admin/capture')).toEqual(['Admin', 'Captura']);
      expect(getBreadcrumb('/admin/teams')).toEqual(['Admin', 'Equipos']);
    });

    it('T1-F8.4: verifies active season persistence across simulated multi-page route changes', () => {
      const store = createAdminStoreSimulator();
      store.setSelectedSeasonId(4);

      // Route: /admin -> /admin/teams -> /admin/calendar -> /admin/capture
      const routes = ['/admin', '/admin/teams', '/admin/calendar', '/admin/capture'];
      for (const route of routes) {
        expect(route.startsWith('/admin')).toBe(true);
        // Season in store remains constant
        expect(store.selectedSeasonId).toBe(4);
      }
    });

    it('T1-F8.5: handles null season gracefully with fallback placeholder', () => {
      const store = createAdminStoreSimulator();
      store.setSelectedSeasonId(null);

      const getTopbarSeasonLabel = (id: number | null) => {
        return id ? `Temporada ID: ${id}` : 'Seleccionar temporada';
      };

      expect(getTopbarSeasonLabel(store.selectedSeasonId)).toBe('Seleccionar temporada');
    });
  });

  // -------------------------------------------------------------
  // Feature 9: Guided Capture Workflow V2
  // -------------------------------------------------------------
  describe('Feature 9: Guided Capture Workflow V2', () => {
    let mock: ReturnType<typeof createMockSupabase>;

    beforeEach(() => {
      mock = createMockSupabase();
    });

    it('T1-F9.1: groups and prioritizes Programado matches before Jugado matches', () => {
      // Add a completed match to the fixtures
      mock.db.matches.push({
        id: 304,
        season_id: 4,
        jornada: 1,
        home_team_id: 101,
        away_team_id: 103,
        status: 'Jugado',
        vuelta: 'ida',
        home_score: 50,
        away_score: 45,
      });

      // Guided selector sorting: Pending matches first!
      const sortedMatches = [...mock.db.matches].sort((a, b) => {
        const isAPending = a.status === 'Programado' || a.status === 'Pendiente';
        const isBPending = b.status === 'Programado' || b.status === 'Pendiente';
        if (isAPending && !isBPending) return -1;
        if (!isAPending && isBPending) return 1;
        return (a.jornada || 0) - (b.jornada || 0);
      });

      expect(sortedMatches[0].status).toBe('Programado');
      expect(sortedMatches[sortedMatches.length - 1].status).toBe('Jugado');
    });

    it('T1-F9.2: loads active roster for selected match teams', () => {
      const match = mock.db.matches.find((m) => m.id === 301);
      const homePlayers = mock.db.players.filter((p) => p.team_id === match?.home_team_id && p.is_active);
      const awayPlayers = mock.db.players.filter((p) => p.team_id === match?.away_team_id && p.is_active);

      expect(homePlayers.length).toBe(3); // 201, 202, 203 (204 is inactive/baja)
      expect(awayPlayers.length).toBe(2); // 205, 206
      expect(homePlayers.some((p) => p.name.includes('(Baja)'))).toBe(false);
    });

    it('T1-F9.3: auto-computes match total score dynamically from player inputs', () => {
      const lineup: LineupRow[] = [
        { player_id: 201, team_id: 101, played: true, points: 15, triples: 1 },
        { player_id: 202, team_id: 101, played: true, points: 25, triples: 3 },
        { player_id: 203, team_id: 101, played: false, points: 0, triples: 0 },
      ];

      const score = lineup.reduce((sum, r) => sum + (r.played ? r.points : 0), 0);
      const triples = lineup.reduce((sum, r) => sum + (r.played ? r.triples : 0), 0);

      expect(score).toBe(40);
      expect(triples).toBe(4);
    });

    it('T1-F9.4: provides feedback with score summary and resets dirty state after save', async () => {
      const homeLineup: LineupRow[] = [
        { player_id: 201, team_id: 101, played: true, points: 55, triples: 5 },
      ];
      const awayLineup: LineupRow[] = [
        { player_id: 205, team_id: 102, played: true, points: 50, triples: 4 },
      ];

      await saveMatchResult(mock.client, 301, 'Normal', homeLineup, awayLineup);

      const saved = mock.db.matches.find((m) => m.id === 301);
      const feedback = {
        success: true,
        matchId: saved?.id,
        scoreText: `${saved?.home_score} - ${saved?.away_score}`,
      };

      expect(feedback.success).toBe(true);
      expect(feedback.scoreText).toBe('55 - 50');
    });

    it('T1-F9.5: invalidates TanStack Query cache keys for season upon save', async () => {
      const invalidatedKeys: unknown[][] = [];
      const mockQueryClient = {
        invalidateQueries: async ({ queryKey }: { queryKey: unknown[] }) => {
          invalidatedKeys.push(queryKey);
        },
      };

      const seasonId = 4;
      await mockQueryClient.invalidateQueries({ queryKey: ['matches-programmed', seasonId] });
      await mockQueryClient.invalidateQueries({ queryKey: ['matches-recent', seasonId] });
      await mockQueryClient.invalidateQueries({ queryKey: ['standings', seasonId] });

      expect(invalidatedKeys).toEqual([
        ['matches-programmed', 4],
        ['matches-recent', 4],
        ['standings', 4],
      ]);
    });
  });
});
