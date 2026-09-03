/**
 * tests/e2e/helpers/test-fixtures.ts
 * High-fidelity test fixtures, in-memory Supabase simulator, and admin domain helpers.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Domain Models ---
export interface SeasonFixture {
  id: number;
  name: string;
  category: string;
  year?: number;
  is_active: boolean;
  is_test?: boolean;
}

export interface TeamFixture {
  id: number;
  season_id: number;
  name: string;
  category: string;
  logo_url?: string | null;
}

export interface PlayerFixture {
  id: number;
  team_id: number;
  name: string;
  number?: string | number | null;
  is_active: boolean;
}

export interface MatchFixture {
  id: number;
  season_id: number;
  jornada?: number | null;
  home_team_id: number;
  away_team_id: number;
  home_score?: number | null;
  away_score?: number | null;
  status: string;
  phase?: string | null;
  vuelta: 'ida' | 'vuelta' | 'liguilla';
  played_date?: string | null;
  home_team?: { id: number; name: string };
  away_team?: { id: number; name: string };
}

export interface PlayerMatchStatFixture {
  id?: number;
  match_id: number;
  player_id: number;
  team_id: number;
  played: boolean;
  points: number;
  triples: number;
}

export interface DatabaseState {
  seasons: SeasonFixture[];
  teams: TeamFixture[];
  players: PlayerFixture[];
  matches: MatchFixture[];
  player_match_stats: PlayerMatchStatFixture[];
  player_credentials: Array<{
    id: number;
    player_id: number;
    team_id: number;
    season_id: number;
    status: 'vigente' | 'revocada' | 'pendiente';
  }>;
}

// --- Sample Fixture Data ---
export function createDefaultDatabaseState(): DatabaseState {
  return {
    seasons: [
      { id: 2, name: 'Liga Veteranos Antiguo', category: 'Veteranos', is_active: false },
      { id: 3, name: 'Liga Femenil 2026', category: 'Femenil', is_active: true },
      { id: 4, name: 'Liga Tercera Fuerza 2026', category: '3ra', is_active: true },
      { id: 10, name: 'LIGA LIBRE 2026', category: 'Libre', is_active: true },
      { id: 11, name: 'LIGA MASTER', category: 'Master', is_active: true },
      { id: 12, name: 'Liga Veteranos 2026', category: 'Veteranos', is_active: true },
    ],
    teams: [
      { id: 101, season_id: 4, name: 'Muebles Carlitos', category: '3ra' },
      { id: 102, season_id: 4, name: 'M-Sport', category: '3ra' },
      { id: 103, season_id: 4, name: 'Águilas de Nochixtlán', category: '3ra' },
      { id: 104, season_id: 4, name: 'Halcones Rojos', category: '3ra' },
      { id: 105, season_id: 4, name: '12 de Octubre', category: '3ra' },
      { id: 106, season_id: 4, name: 'Toros de Huajuapan', category: '3ra' },
      { id: 107, season_id: 4, name: 'Lobos BUAP', category: '3ra' },
      { id: 108, season_id: 3, name: 'Amazonas', category: 'Femenil' },
    ],
    players: [
      { id: 201, team_id: 101, name: 'Carlos Ramos', number: '7', is_active: true },
      { id: 202, team_id: 101, name: 'Pedro Morales', number: '10', is_active: true },
      { id: 203, team_id: 101, name: 'Juan Hernández', number: '15', is_active: true },
      { id: 204, team_id: 101, name: 'Roberto Díaz (Baja)', number: '23', is_active: false },
      { id: 205, team_id: 102, name: 'Miguel López', number: '8', is_active: true },
      { id: 206, team_id: 102, name: 'Antonio Sánchez', number: '11', is_active: true },
      { id: 207, team_id: 103, name: 'Alejandro Cruz', number: '3', is_active: true },
      { id: 208, team_id: 104, name: 'Héctor Jiménez', number: '9', is_active: true },
    ],
    matches: [
      {
        id: 301,
        season_id: 4,
        jornada: 1,
        home_team_id: 101,
        away_team_id: 102,
        status: 'Programado',
        vuelta: 'ida',
        phase: 'Fase Regular',
      },
      {
        id: 302,
        season_id: 4,
        jornada: 1,
        home_team_id: 103,
        away_team_id: 104,
        status: 'Programado',
        vuelta: 'ida',
        phase: 'Fase Regular',
      },
      {
        id: 303,
        season_id: 4,
        jornada: 2,
        home_team_id: 105,
        away_team_id: 106,
        status: 'Programado',
        vuelta: 'ida',
        phase: 'Fase Regular',
      },
    ],
    player_match_stats: [],
    player_credentials: [
      { id: 401, player_id: 201, team_id: 101, season_id: 4, status: 'vigente' },
      { id: 402, player_id: 202, team_id: 101, season_id: 4, status: 'vigente' },
      { id: 403, player_id: 205, team_id: 102, season_id: 4, status: 'pendiente' },
    ],
  };
}

// --- In-Memory Supabase Client Simulator ---
export function createMockSupabase(initialState?: DatabaseState): {
  client: SupabaseClient;
  db: DatabaseState;
} {
  const db: DatabaseState = initialState
    ? JSON.parse(JSON.stringify(initialState))
    : createDefaultDatabaseState();

  let nextStatId = 1000;

  type DbRow = Record<string, unknown>;

  function executeQuery(table: string) {
    let rows: DbRow[] = [];
    if (table === 'seasons') rows = db.seasons as unknown as DbRow[];
    else if (table === 'teams') rows = db.teams as unknown as DbRow[];
    else if (table === 'players') rows = db.players as unknown as DbRow[];
    else if (table === 'matches') {
      rows = db.matches.map((m) => ({
        ...m,
        home_team: db.teams.find((t) => t.id === m.home_team_id) || { id: m.home_team_id, name: `Equipo ${m.home_team_id}` },
        away_team: db.teams.find((t) => t.id === m.away_team_id) || { id: m.away_team_id, name: `Equipo ${m.away_team_id}` },
      })) as unknown as DbRow[];
    } else if (table === 'player_match_stats') {
      rows = db.player_match_stats.map((s) => ({
        ...s,
        matches: db.matches.find((m) => m.id === s.match_id),
      })) as unknown as DbRow[];
    } else if (table === 'player_credentials') {
      rows = db.player_credentials as unknown as DbRow[];
    }

    const filters: Array<(item: DbRow) => boolean> = [];
    let sortFn: ((a: DbRow, b: DbRow) => number) | null = null;
    let limitCount: number | null = null;
    let isCountHead = false;

    const builder = {
      select: (_cols?: string, options?: { count?: string; head?: boolean }) => {
        if (options?.head && options?.count === 'exact') {
          isCountHead = true;
        }
        return builder;
      },
      eq: (col: string, val: unknown) => {
        filters.push((item) => item[col] === val);
        return builder;
      },
      in: (col: string, vals: unknown[]) => {
        filters.push((item) => vals.includes(item[col]));
        return builder;
      },
      or: (conditionString: string) => {
        const parts = conditionString.split(',');
        filters.push((item) => {
          return parts.some((p) => {
            const [field, op, rawVal] = p.split('.');
            const val = isNaN(Number(rawVal)) ? rawVal : Number(rawVal);
            if (op === 'eq') return item[field] === val;
            return false;
          });
        });
        return builder;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        const asc = opts?.ascending !== false;
        sortFn = (a, b) => {
          const valA = String(a[col] ?? '');
          const valB = String(b[col] ?? '');
          if (valA < valB) return asc ? -1 : 1;
          if (valA > valB) return asc ? 1 : -1;
          return 0;
        };
        return builder;
      },
      limit: (n: number) => {
        limitCount = n;
        return builder;
      },
      single: async () => {
        let result = rows.filter((r) => filters.every((f) => f(r)));
        if (sortFn) result = result.sort(sortFn);
        const item = result[0];
        if (!item) return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
        return { data: JSON.parse(JSON.stringify(item)), error: null };
      },
      then: (
        resolve: (val: { data: DbRow[] | null; count?: number; error: null }) => unknown,
        reject?: (err: unknown) => unknown
      ) => {
        let result = rows.filter((r) => filters.every((f) => f(r)));
        if (sortFn) result = result.sort(sortFn);
        if (limitCount !== null) result = result.slice(0, limitCount);

        if (isCountHead) {
          return Promise.resolve({ data: null, count: result.length, error: null }).then(resolve, reject);
        }
        return Promise.resolve({ data: JSON.parse(JSON.stringify(result)), error: null }).then(resolve, reject);
      },
      insert: async (records: DbRow | DbRow[]) => {
        const toInsert = Array.isArray(records) ? records : [records];

        if (table === 'matches') {
          for (const rec of toInsert) {
            const vueltaVal = rec.vuelta as string;
            // Check matches_vuelta_check
            if (!vueltaVal || !['ida', 'vuelta', 'liguilla'].includes(vueltaVal)) {
              return {
                data: null,
                error: {
                  code: '23514',
                  message: 'new row for relation "matches" violates check constraint "matches_vuelta_check"',
                },
              };
            }
            const newMatch: MatchFixture = {
              id: (rec.id as number) || Math.floor(Math.random() * 100000),
              season_id: rec.season_id as number,
              jornada: (rec.jornada as number) || 1,
              home_team_id: rec.home_team_id as number,
              away_team_id: rec.away_team_id as number,
              home_score: (rec.home_score as number) ?? null,
              away_score: (rec.away_score as number) ?? null,
              status: (rec.status as string) || 'Programado',
              phase: (rec.phase as string) || 'Fase Regular',
              vuelta: vueltaVal as 'ida' | 'vuelta' | 'liguilla',
              played_date: (rec.played_date as string) || null,
            };
            db.matches.push(newMatch);
          }
          return { data: toInsert, error: null };
        }

        if (table === 'player_match_stats') {
          for (const stat of toInsert) {
            db.player_match_stats.push({
              id: ++nextStatId,
              match_id: stat.match_id as number,
              player_id: stat.player_id as number,
              team_id: stat.team_id as number,
              played: stat.played as boolean,
              points: stat.points as number,
              triples: stat.triples as number,
            });
          }
          return { data: toInsert, error: null };
        }

        return { data: toInsert, error: null };
      },
      update: (updates: DbRow) => {
        return {
          eq: async (col: string, val: unknown) => {
            if (table === 'matches') {
              const match = db.matches.find((m) => (m as unknown as DbRow)[col] === val);
              if (match) {
                Object.assign(match, updates);
                return { data: [match], error: null };
              }
            }
            return { data: [], error: null };
          },
          in: async (col: string, vals: unknown[]) => {
            if (table === 'matches') {
              const matched = db.matches.filter((m) => vals.includes((m as unknown as DbRow)[col]));
              matched.forEach((m) => Object.assign(m, updates));
              return { data: matched, error: null };
            }
            return { data: [], error: null };
          },
        };
      },
      delete: () => {
        return {
          eq: async (col: string, val: unknown) => {
            if (table === 'player_match_stats') {
              db.player_match_stats = db.player_match_stats.filter((s) => (s as unknown as DbRow)[col] !== val);
              return { data: null, error: null };
            }
            return { data: null, error: null };
          },
        };
      },
    };

    return builder;
  }

  const client = {
    from: (table: string) => executeQuery(table),
  };

  return { client: client as unknown as SupabaseClient, db };
}

// --- Admin Store Simulator (Zustand Contract) ---
export interface AdminStoreSimulator {
  selectedSeasonId: number | null;
  setSelectedSeasonId: (seasonId: number | null) => void;
  initializeSeason: (activeSeasons: Array<{ id: number; name: string }>, searchParamsSeason?: string | null) => void;
  getStorageValue: () => string | null;
  clearStorage: () => void;
}

export function createAdminStoreSimulator(initialStorage: Record<string, string> = {}): AdminStoreSimulator {
  const localStorageMock: Record<string, string> = { ...initialStorage };
  const STORAGE_KEY = 'selected_admin_season_id';

  let selectedSeasonId: number | null = null;

  return {
    get selectedSeasonId() {
      return selectedSeasonId;
    },
    setSelectedSeasonId(id: number | null) {
      selectedSeasonId = id;
      if (id !== null) {
        localStorageMock[STORAGE_KEY] = String(id);
      } else {
        delete localStorageMock[STORAGE_KEY];
      }
    },
    initializeSeason(activeSeasons: Array<{ id: number; name: string }>, searchParamsSeason?: string | null) {
      // 1. Highest precedence: URL search param
      if (searchParamsSeason) {
        const parsed = parseInt(searchParamsSeason, 10);
        if (!isNaN(parsed) && activeSeasons.some((s) => s.id === parsed)) {
          this.setSelectedSeasonId(parsed);
          return;
        }
      }

      // 2. Local storage persistence
      const stored = localStorageMock[STORAGE_KEY];
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && activeSeasons.some((s) => s.id === parsed)) {
          selectedSeasonId = parsed;
          return;
        }
      }

      // 3. Fallback: First active season
      if (activeSeasons.length > 0) {
        this.setSelectedSeasonId(activeSeasons[0].id);
      } else {
        this.setSelectedSeasonId(null);
      }
    },
    getStorageValue() {
      return localStorageMock[STORAGE_KEY] ?? null;
    },
    clearStorage() {
      delete localStorageMock[STORAGE_KEY];
      selectedSeasonId = null;
    },
  };
}

// --- Filter, Search, Sort & Counter Engine ---
export interface FilterSortOptions {
  searchQuery?: string;
  categoryFilter?: string; // 'all' | specific
  sortDirection?: 'asc' | 'desc'; // A-Z or Z-A
}

export function applyFilterAndSort<T extends { name: string; category?: string }>(
  items: T[],
  options: FilterSortOptions
): {
  filteredItems: T[];
  counterText: string;
  totalCount: number;
  matchedCount: number;
} {
  const totalCount = items.length;
  let results = [...items];

  // 1. Category filter
  if (options.categoryFilter && options.categoryFilter !== 'all') {
    results = results.filter((item) => item.category === options.categoryFilter);
  }

  // 2. Instant Search (case-insensitive, accent-tolerant, substring/prefix)
  if (options.searchQuery && options.searchQuery.trim().length > 0) {
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const queryNorm = normalize(options.searchQuery.trim());
    results = results.filter((item) => normalize(item.name).includes(queryNorm));
  }

  // 3. A-Z Sort with locale natural comparison
  const dir = options.sortDirection === 'desc' ? -1 : 1;
  results.sort((a, b) => dir * a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

  const matchedCount = results.length;
  const counterText = `${matchedCount} de ${totalCount}`;

  return {
    filteredItems: results,
    counterText,
    totalCount,
    matchedCount,
  };
}

// --- Double Submit Protection Simulator ---
export class DoubleSubmitGuard {
  private inFlight = false;
  private callCount = 0;

  get isSubmitting() {
    return this.inFlight;
  }

  get successfulExecutions() {
    return this.callCount;
  }

  async execute<T>(action: () => Promise<T>): Promise<T> {
    if (this.inFlight) {
      throw new Error('DUPLICATE_SUBMISSION_REJECTED: Another save is already in progress');
    }

    this.inFlight = true;
    try {
      const result = await action();
      this.callCount++;
      return result;
    } finally {
      this.inFlight = false;
    }
  }
}
