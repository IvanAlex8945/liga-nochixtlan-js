import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { useAdminStore, ADMIN_SEASON_STORAGE_KEY, safePersistStorage } from '../lib/admin-store';

class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe('AdminStore (lib/admin-store.ts)', () => {
  const activeSeasons = [
    { id: 3, name: 'Liga Femenil 2026', is_active: true },
    { id: 4, name: 'Liga Tercera Fuerza 2026', is_active: true },
    { id: 10, name: 'LIGA LIBRE 2026', is_active: true },
    { id: 11, name: 'LIGA MASTER', is_active: true },
    { id: 12, name: 'Liga Veteranos 2026', is_active: true },
  ];

  const localStorageMock = new LocalStorageMock();

  beforeAll(() => {
    // Provide window and localStorage in Node test runtime
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: localStorageMock,
    };
    (globalThis as unknown as { localStorage: unknown }).localStorage = localStorageMock;
  });

  afterAll(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
    delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
  });

  beforeEach(() => {
    localStorageMock.clear();
    useAdminStore.getState().clearSeason();
  });

  it('initializes with null selectedSeasonId when cleared', () => {
    expect(useAdminStore.getState().selectedSeasonId).toBeNull();
  });

  it('persists selected season to localStorage under selected_admin_season_id', () => {
    useAdminStore.getState().setSelectedSeasonId(4);
    expect(useAdminStore.getState().selectedSeasonId).toBe(4);
    const stored = localStorageMock.getItem(ADMIN_SEASON_STORAGE_KEY);
    expect(stored).toBeTruthy();
    expect(stored).toContain('"selectedSeasonId":4');
  });

  it('retains user-selected season (Season 4) when initializeSeason is called with active seasons', () => {
    useAdminStore.getState().setSelectedSeasonId(4);
    useAdminStore.getState().initializeSeason(activeSeasons);
    expect(useAdminStore.getState().selectedSeasonId).toBe(4);
    expect(useAdminStore.getState().selectedSeasonId).not.toBe(3); // Regression eliminated
  });

  it('falls back to the first active season when storage is empty or seasonId is null', () => {
    useAdminStore.getState().initializeSeason(activeSeasons);
    expect(useAdminStore.getState().selectedSeasonId).toBe(3);
  });

  it('falls back to the first active season when stored seasonId is not in activeSeasons', () => {
    useAdminStore.getState().setSelectedSeasonId(999);
    useAdminStore.getState().initializeSeason(activeSeasons);
    expect(useAdminStore.getState().selectedSeasonId).toBe(3);
  });

  it('honors URL search param season with highest precedence', () => {
    useAdminStore.getState().setSelectedSeasonId(4);
    useAdminStore.getState().initializeSeason(activeSeasons, '10');
    expect(useAdminStore.getState().selectedSeasonId).toBe(10);
  });

  it('honors numeric URL search param season', () => {
    useAdminStore.getState().setSelectedSeasonId(4);
    useAdminStore.getState().initializeSeason(activeSeasons, 11);
    expect(useAdminStore.getState().selectedSeasonId).toBe(11);
  });

  it('falls back to stored season if URL param refers to non-existent season', () => {
    useAdminStore.getState().setSelectedSeasonId(4);
    useAdminStore.getState().initializeSeason(activeSeasons, '999');
    expect(useAdminStore.getState().selectedSeasonId).toBe(4);
  });

  it('ignores empty string or non-numeric URL search param', () => {
    useAdminStore.getState().setSelectedSeasonId(4);
    useAdminStore.getState().initializeSeason(activeSeasons, '');
    expect(useAdminStore.getState().selectedSeasonId).toBe(4);

    useAdminStore.getState().initializeSeason(activeSeasons, 'abc');
    expect(useAdminStore.getState().selectedSeasonId).toBe(4);
  });

  it('handles empty activeSeasons array safely without throwing', () => {
    useAdminStore.getState().setSelectedSeasonId(4);
    useAdminStore.getState().initializeSeason([]);
    expect(useAdminStore.getState().selectedSeasonId).toBe(4);
  });

  it('sets null for invalid season IDs in setSelectedSeasonId', () => {
    useAdminStore.getState().setSelectedSeasonId(0);
    expect(useAdminStore.getState().selectedSeasonId).toBeNull();

    useAdminStore.getState().setSelectedSeasonId(-5);
    expect(useAdminStore.getState().selectedSeasonId).toBeNull();

    useAdminStore.getState().setSelectedSeasonId(Number.NaN);
    expect(useAdminStore.getState().selectedSeasonId).toBeNull();
  });

  describe('safePersistStorage adapter', () => {
    it('parses standard Zustand JSON format correctly', () => {
      localStorageMock.setItem(
        ADMIN_SEASON_STORAGE_KEY,
        JSON.stringify({ state: { selectedSeasonId: 10 }, version: 0 })
      );

      const result = safePersistStorage.getItem(ADMIN_SEASON_STORAGE_KEY);
      expect(result).not.toBeNull();
      if (result && typeof result === 'object' && 'state' in result) {
        expect((result as { state: { selectedSeasonId: number | null } }).state.selectedSeasonId).toBe(10);
      }
    });

    it('parses raw legacy string format (e.g. "4") correctly', () => {
      localStorageMock.setItem(ADMIN_SEASON_STORAGE_KEY, '4');

      const result = safePersistStorage.getItem(ADMIN_SEASON_STORAGE_KEY);
      expect(result).not.toBeNull();
      if (result && typeof result === 'object' && 'state' in result) {
        expect((result as { state: { selectedSeasonId: number | null } }).state.selectedSeasonId).toBe(4);
      }
    });

    it('returns null for corrupted or invalid storage values', () => {
      localStorageMock.setItem(ADMIN_SEASON_STORAGE_KEY, 'invalid-non-numeric');
      const result = safePersistStorage.getItem(ADMIN_SEASON_STORAGE_KEY);
      expect(result).toBeNull();
    });

    it('returns null when storage item does not exist', () => {
      const result = safePersistStorage.getItem('non_existent_key');
      expect(result).toBeNull();
    });

    it('setItem and removeItem interact with localStorage cleanly', () => {
      safePersistStorage.setItem(ADMIN_SEASON_STORAGE_KEY, {
        state: { selectedSeasonId: 12 },
        version: 0,
      });
      const stored = localStorageMock.getItem(ADMIN_SEASON_STORAGE_KEY);
      expect(stored).toContain('"selectedSeasonId":12');

      safePersistStorage.removeItem(ADMIN_SEASON_STORAGE_KEY);
      expect(localStorageMock.getItem(ADMIN_SEASON_STORAGE_KEY)).toBeNull();
    });
  });
});
