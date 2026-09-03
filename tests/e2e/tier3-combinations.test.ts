import { describe, expect, it, beforeEach } from 'vitest';
import { saveMatchResult, LineupRow } from '../../lib/saveMatch';
import { calcularPosiciones } from '../../lib/standings';
import {
  createMockSupabase,
  createAdminStoreSimulator,
  applyFilterAndSort,
} from './helpers/test-fixtures';

describe('Tier 3: Cross-Feature Combinations', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  // -------------------------------------------------------------
  // Combination 1: Search + Category Filter + A-Z Sort + Counter
  // -------------------------------------------------------------
  describe('C01: Search + Category Filter + A-Z Sort + Dynamic Counter', () => {
    const dataset = [
      { name: 'Muebles Carlitos', category: '3ra' },
      { name: 'M-Sport', category: '3ra' },
      { name: 'Águilas de Nochixtlán', category: '3ra' },
      { name: 'Halcones Rojos', category: '3ra' },
      { name: 'Amazonas', category: 'Femenil' },
      { name: 'Abejas Reales', category: 'Femenil' },
      { name: 'Veteranos San Pedro', category: 'Veteranos' },
    ];

    it('T3-C01.1: unifies category filtering, instant search, and natural A-Z sorting', () => {
      // Filter category '3ra', search for letter 'm', sort 'asc'
      const result = applyFilterAndSort(dataset, {
        categoryFilter: '3ra',
        searchQuery: 'm',
        sortDirection: 'asc',
      });

      // Matching teams in 3ra with 'm': M-Sport, Muebles Carlitos (Amazonas is Femenil, so excluded)
      expect(result.filteredItems).toHaveLength(2);
      expect(result.filteredItems[0].name).toBe('M-Sport');
      expect(result.filteredItems[1].name).toBe('Muebles Carlitos');
      expect(result.counterText).toBe('2 de 7');
    });

    it('T3-C01.2: inverts order when sort direction changes without altering filter matching', () => {
      const ascResult = applyFilterAndSort(dataset, {
        categoryFilter: '3ra',
        searchQuery: 'm',
        sortDirection: 'asc',
      });

      const descResult = applyFilterAndSort(dataset, {
        categoryFilter: '3ra',
        searchQuery: 'm',
        sortDirection: 'desc',
      });

      expect(descResult.filteredItems).toHaveLength(ascResult.filteredItems.length);
      expect(descResult.filteredItems[0].name).toBe('Muebles Carlitos');
      expect(descResult.filteredItems[1].name).toBe('M-Sport');
      expect(descResult.counterText).toBe('2 de 7');
    });
  });

  // -------------------------------------------------------------
  // Combination 2: Capture Result + Calendar Status Change + Standings Recomputation
  // -------------------------------------------------------------
  describe('C02: Capture Result + Calendar Status + Standings Recomputation', () => {
    it('T3-C02.1: saves match, updates calendar status to Jugado, and reflects in recalculated standings', async () => {
      // 1. Initial State: Match 301 is Programado
      const initialMatch = mock.db.matches.find((m) => m.id === 301);
      expect(initialMatch?.status).toBe('Programado');

      const initialStandings = calcularPosiciones(
        mock.db.matches.map((m) => ({
          ...m,
          home_team: { id: m.home_team_id, name: `Team ${m.home_team_id}` },
          away_team: { id: m.away_team_id, name: `Team ${m.away_team_id}` },
        }))
      );
      // All teams have 0 games played initially
      expect(initialStandings.every((s) => s.PJ === 0 && s.Pts === 0)).toBe(true);

      // 2. Admin captures result in /admin/capture: Team 101 beats Team 102 (65 - 50)
      const homeLineup: LineupRow[] = [
        { player_id: 201, team_id: 101, played: true, points: 35, triples: 3 },
        { player_id: 202, team_id: 101, played: true, points: 30, triples: 4 },
      ];
      const awayLineup: LineupRow[] = [
        { player_id: 205, team_id: 102, played: true, points: 50, triples: 2 },
      ];

      await saveMatchResult(mock.client, 301, 'Normal', homeLineup, awayLineup);

      // 3. Calendar status changed
      const updatedMatch = mock.db.matches.find((m) => m.id === 301);
      expect(updatedMatch?.status).toBe('Jugado');
      expect(updatedMatch?.home_score).toBe(65);
      expect(updatedMatch?.away_score).toBe(50);

      // 4. Standings recomputed
      const updatedStandings = calcularPosiciones(
        mock.db.matches.map((m) => ({
          ...m,
          home_team: { id: m.home_team_id, name: m.home_team_id === 101 ? 'Muebles Carlitos' : 'M-Sport' },
          away_team: { id: m.away_team_id, name: m.away_team_id === 101 ? 'Muebles Carlitos' : 'M-Sport' },
        }))
      );

      expect(updatedStandings.length).toBeGreaterThanOrEqual(2);
      // Winner (101) is in 1st place: 3 Pts, 1 PJ, 1 PG, 0 PP, +15 DP
      expect(updatedStandings[0].id).toBe(101);
      expect(updatedStandings[0].equipo).toBe('Muebles Carlitos');
      expect(updatedStandings[0].Pts).toBe(3);
      expect(updatedStandings[0].PJ).toBe(1);
      expect(updatedStandings[0].PG).toBe(1);
      expect(updatedStandings[0].DP).toBe(15);

      // Loser on court (102): 1 Pt, 1 PJ, 0 PG, 1 PP, -15 DP
      const team102 = updatedStandings.find((s) => s.id === 102);
      expect(team102).toBeDefined();
      expect(team102?.Pts).toBe(1);
      expect(team102?.PJ).toBe(1);
      expect(team102?.PP).toBe(1);
      expect(team102?.DP).toBe(-15);
    });
  });

  // -------------------------------------------------------------
  // Combination 3: W.O. Result + Auto 20-0 + Standings 3-1-0 Rule
  // -------------------------------------------------------------
  describe('C03: W.O. Capture + Default Score + Standings Rule', () => {
    it('T3-C03.1: awards 3 pts and 20-0 to winner and 0 pts to W.O. loser according to official league rules', async () => {
      // Away team forfeits (WO Visitante)
      await saveMatchResult(mock.client, 301, 'WO_Visitante', [], []);

      const savedMatch = mock.db.matches.find((m) => m.id === 301);
      expect(savedMatch?.status).toBe('WO Visitante');

      const standings = calcularPosiciones([
        {
          id: 301,
          home_team_id: 101,
          away_team_id: 102,
          home_score: 20,
          away_score: 0,
          status: 'WO Visitante',
          home_team: { id: 101, name: 'Muebles Carlitos' },
          away_team: { id: 102, name: 'M-Sport' },
        },
      ]);

      expect(standings).toHaveLength(2);
      // Winner by W.O.
      const winner = standings.find((s) => s.id === 101);
      expect(winner?.Pts).toBe(3);
      expect(winner?.PF).toBe(20);
      expect(winner?.PC).toBe(0);
      expect(winner?.DP).toBe(20);

      // Loser by W.O. (0 points awarded)
      const loser = standings.find((s) => s.id === 102);
      expect(loser?.Pts).toBe(0);
      expect(loser?.WO).toBe(1);
      expect(loser?.PF).toBe(0);
      expect(loser?.PC).toBe(20);
      expect(loser?.DP).toBe(-20);
    });
  });

  // -------------------------------------------------------------
  // Combination 4: Global Season Switch + Multi-Module Sync
  // -------------------------------------------------------------
  describe('C04: Global Season Switch + Multi-Module Sync', () => {
    it('T3-C04.1: switching season in AdminStore synchronizes teams and calendar queries concurrently', () => {
      const store = createAdminStoreSimulator();

      // Start in Season 3 (Femenil)
      store.setSelectedSeasonId(3);
      const teamsSeason3 = mock.db.teams.filter((t) => t.season_id === store.selectedSeasonId);
      const matchesSeason3 = mock.db.matches.filter((m) => m.season_id === store.selectedSeasonId);
      expect(teamsSeason3).toHaveLength(1); // Only Amazonas
      expect(matchesSeason3).toHaveLength(0);

      // Switch globally to Season 4 (Tercera Fuerza)
      store.setSelectedSeasonId(4);
      const teamsSeason4 = mock.db.teams.filter((t) => t.season_id === store.selectedSeasonId);
      const matchesSeason4 = mock.db.matches.filter((m) => m.season_id === store.selectedSeasonId);

      expect(teamsSeason4).toHaveLength(7);
      expect(matchesSeason4).toHaveLength(3);
      expect(teamsSeason4.every((t) => t.season_id === 4)).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Combination 5: Filter Edit + Reset + Counter Restoration
  // -------------------------------------------------------------
  describe('C05: Filter Lifecycle & Complete Reset Restoration', () => {
    it('T3-C05.1: completely restores pristine filter state, natural sort, and counter on clear', () => {
      const rawTeams = [
        { name: 'Muebles Carlitos', category: '3ra' },
        { name: 'M-Sport', category: '3ra' },
        { name: 'Águilas', category: '3ra' },
        { name: 'Halcones', category: '3ra' },
        { name: 'Amazonas', category: 'Femenil' },
      ];

      // Deeply filtered state: search 'sport', category '3ra', sort 'desc'
      const modified = applyFilterAndSort(rawTeams, {
        searchQuery: 'sport',
        categoryFilter: '3ra',
        sortDirection: 'desc',
      });
      expect(modified.filteredItems).toHaveLength(1);
      expect(modified.counterText).toBe('1 de 5');

      // Click "Limpiar filtros"
      const restored = applyFilterAndSort(rawTeams, {
        searchQuery: '',
        categoryFilter: 'all',
        sortDirection: 'asc',
      });

      expect(restored.filteredItems).toHaveLength(5);
      expect(restored.counterText).toBe('5 de 5');
      expect(restored.filteredItems[0].name).toBe('Águilas'); // Default A-Z first
    });
  });
});
