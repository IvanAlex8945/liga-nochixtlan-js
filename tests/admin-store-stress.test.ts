import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  useAdminStore,
  ADMIN_SEASON_STORAGE_KEY,
  safePersistStorage,
  type SeasonRef,
} from '../lib/admin-store';

class LocalStorageMock {
  private store: Record<string, string> = {};
  public shouldThrowOnGet = false;
  public shouldThrowOnSet = false;
  public shouldThrowOnRemove = false;

  getItem(key: string): string | null {
    if (this.shouldThrowOnGet) {
      throw new Error('QuotaExceededError or SecurityError on getItem');
    }
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrowOnSet) {
      throw new Error('QuotaExceededError or SecurityError on setItem');
    }
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    if (this.shouldThrowOnRemove) {
      throw new Error('SecurityError on removeItem');
    }
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
    this.shouldThrowOnGet = false;
    this.shouldThrowOnSet = false;
    this.shouldThrowOnRemove = false;
  }
}

describe('Adversarial Stress Testing: lib/admin-store.ts', () => {
  const activeSeasons: SeasonRef[] = [
    { id: 3, name: 'Liga Femenil 2026', category: 'Femenil', is_active: true },
    { id: 4, name: 'Liga Tercera Fuerza 2026', category: 'Tercera Fuerza', is_active: true },
    { id: 10, name: 'LIGA LIBRE 2026', category: 'Libre', is_active: true },
    { id: 11, name: 'LIGA MASTER', category: 'Master', is_active: true },
    { id: 12, name: 'Liga Veteranos 2026', category: 'Veteranos', is_active: true },
  ];

  const localStorageMock = new LocalStorageMock();

  beforeAll(() => {
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

  describe('1. Corrupted & Adversarial LocalStorage Values', () => {
    const malformedInputs = [
      { label: 'Truncated JSON', val: '{"state":{"selectedSeasonId":' },
      { label: 'Unclosed brace', val: '{"state":{"selectedSeasonId":4}' },
      { label: 'Single-quoted JSON', val: "{'state':{'selectedSeasonId':4}}" },
      { label: 'Raw string letters', val: 'undefined' },
      { label: 'Raw string null', val: 'null' },
      { label: 'Raw string NaN', val: 'NaN' },
      { label: 'Raw string Infinity', val: 'Infinity' },
      { label: 'Raw string -Infinity', val: '-Infinity' },
      { label: 'HTML payload', val: '<script>alert(1)</script>' },
      { label: 'Empty string', val: '' },
      { label: 'Whitespace string', val: '   ' },
      { label: 'Negative integer as string', val: '-4' },
      { label: 'Zero as string', val: '0' },
      { label: 'Float string', val: '4.789' },
      { label: 'Non-numeric string prefix', val: 'season_4' },
      { label: 'JSON with null state', val: JSON.stringify({ state: null }) },
      { label: 'JSON with string state', val: JSON.stringify({ state: 'corrupted' }) },
      { label: 'JSON with array state', val: JSON.stringify({ state: [4] }) },
      { label: 'JSON with boolean state', val: JSON.stringify({ state: true }) },
      { label: 'JSON with negative seasonId', val: JSON.stringify({ state: { selectedSeasonId: -10 } }) },
      { label: 'JSON with zero seasonId', val: JSON.stringify({ state: { selectedSeasonId: 0 } }) },
      { label: 'JSON with string seasonId', val: JSON.stringify({ state: { selectedSeasonId: '4' } }) },
      { label: 'JSON with float seasonId', val: JSON.stringify({ state: { selectedSeasonId: 4.5 } }) },
      { label: 'JSON with object seasonId', val: JSON.stringify({ state: { selectedSeasonId: {} } }) },
      { label: 'JSON with array seasonId', val: JSON.stringify({ state: { selectedSeasonId: [4] } }) },
      { label: 'JSON with null seasonId', val: JSON.stringify({ state: { selectedSeasonId: null } }) },
      { label: 'JSON array', val: JSON.stringify([1, 2, 3]) },
      { label: 'JSON boolean true', val: 'true' },
      { label: 'JSON boolean false', val: 'false' },
    ];

    malformedInputs.forEach(({ label, val }) => {
      it(`handles corrupted storage safely without throwing: [${label}]`, () => {
        localStorageMock.setItem(ADMIN_SEASON_STORAGE_KEY, val);
        expect(() => {
          const res = safePersistStorage.getItem(ADMIN_SEASON_STORAGE_KEY);
          // If getItem returns something, state.selectedSeasonId must either be null or a positive finite number
          if (res && typeof res === 'object' && 'state' in res) {
            const sid = (res as { state: { selectedSeasonId?: unknown } }).state.selectedSeasonId;
            if (sid !== null) {
              expect(typeof sid).toBe('number');
              expect(Number.isFinite(sid)).toBe(true);
              expect((sid as number) > 0).toBe(true);
            }
          }
        }).not.toThrow();
      });
    });

    it('gracefully recovers when storage throws QuotaExceededError or SecurityError', () => {
      localStorageMock.shouldThrowOnGet = true;
      expect(() => safePersistStorage.getItem(ADMIN_SEASON_STORAGE_KEY)).not.toThrow();
      expect(safePersistStorage.getItem(ADMIN_SEASON_STORAGE_KEY)).toBeNull();

      localStorageMock.shouldThrowOnGet = false;
      localStorageMock.shouldThrowOnSet = true;
      expect(() =>
        safePersistStorage.setItem(ADMIN_SEASON_STORAGE_KEY, {
          state: { selectedSeasonId: 10 },
          version: 0,
        })
      ).not.toThrow();

      localStorageMock.shouldThrowOnSet = false;
      localStorageMock.shouldThrowOnRemove = true;
      expect(() => safePersistStorage.removeItem(ADMIN_SEASON_STORAGE_KEY)).not.toThrow();
    });
  });

  describe('2. Rapid Season Switches & Consistency', () => {
    it('survives 1000 rapid season transitions deterministically', () => {
      const seasonCycle = [3, 4, 10, 11, 12, null, 4, 10, 3];
      for (let i = 0; i < 1000; i++) {
        const nextSeason = seasonCycle[i % seasonCycle.length];
        useAdminStore.getState().setSelectedSeasonId(nextSeason);
        expect(useAdminStore.getState().selectedSeasonId).toBe(nextSeason);
      }

      // Terminal state check
      const terminalExpected = seasonCycle[999 % seasonCycle.length];
      expect(useAdminStore.getState().selectedSeasonId).toBe(terminalExpected);

      const storedRaw = localStorageMock.getItem(ADMIN_SEASON_STORAGE_KEY);
      expect(storedRaw).toBeTruthy();
      const parsed = JSON.parse(storedRaw!);
      expect(parsed.state.selectedSeasonId).toBe(terminalExpected);
    });

    it('notifies all store subscribers synchronously on rapid switches', () => {
      const subscriber1Seen: (number | null)[] = [];
      const subscriber2Seen: (number | null)[] = [];

      const unsub1 = useAdminStore.subscribe((state) => {
        subscriber1Seen.push(state.selectedSeasonId);
      });
      const unsub2 = useAdminStore.subscribe((state) => {
        subscriber2Seen.push(state.selectedSeasonId);
      });

      const sequence = [4, 10, 12, null, 3, 11];
      for (const id of sequence) {
        useAdminStore.getState().setSelectedSeasonId(id);
      }

      unsub1();
      unsub2();

      expect(subscriber1Seen).toEqual(sequence);
      expect(subscriber2Seen).toEqual(sequence);
    });

    it('rejects adversarial inputs in setSelectedSeasonId', () => {
      const store = useAdminStore.getState();

      store.setSelectedSeasonId(4);
      expect(useAdminStore.getState().selectedSeasonId).toBe(4);

      // Attempt to poison with negative number
      store.setSelectedSeasonId(-10);
      expect(useAdminStore.getState().selectedSeasonId).toBeNull();

      // Attempt to poison with zero
      store.setSelectedSeasonId(4);
      store.setSelectedSeasonId(0);
      expect(useAdminStore.getState().selectedSeasonId).toBeNull();

      // Attempt to poison with NaN
      store.setSelectedSeasonId(4);
      store.setSelectedSeasonId(Number.NaN);
      expect(useAdminStore.getState().selectedSeasonId).toBeNull();

      // Attempt to poison with Infinity
      store.setSelectedSeasonId(4);
      store.setSelectedSeasonId(Number.POSITIVE_INFINITY);
      expect(useAdminStore.getState().selectedSeasonId).toBeNull();

      // Attempt to poison with string (via typecast)
      store.setSelectedSeasonId(4);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      store.setSelectedSeasonId('10' as any);
      expect(useAdminStore.getState().selectedSeasonId).toBeNull();
    });
  });

  describe('3. Precedence Hierarchy Matrix (URL vs Stored vs Fallback)', () => {
    it('URL Precedence: Valid URL param overrides both stored season and fallback', () => {
      // Stored is Season 4, fallback would be Season 3, but URL specifies Season 10
      useAdminStore.getState().setSelectedSeasonId(4);
      useAdminStore.getState().initializeSeason(activeSeasons, '10');
      expect(useAdminStore.getState().selectedSeasonId).toBe(10);
    });

    it('Stored Precedence: When URL is missing/empty/null/undefined, stored season is preserved', () => {
      useAdminStore.getState().setSelectedSeasonId(4);

      useAdminStore.getState().initializeSeason(activeSeasons, undefined);
      expect(useAdminStore.getState().selectedSeasonId).toBe(4);

      useAdminStore.getState().initializeSeason(activeSeasons, null);
      expect(useAdminStore.getState().selectedSeasonId).toBe(4);

      useAdminStore.getState().initializeSeason(activeSeasons, '');
      expect(useAdminStore.getState().selectedSeasonId).toBe(4);
    });

    it('Stored Precedence: When URL contains non-existent season ID, stored season is preserved', () => {
      useAdminStore.getState().setSelectedSeasonId(4);
      useAdminStore.getState().initializeSeason(activeSeasons, '999');
      expect(useAdminStore.getState().selectedSeasonId).toBe(4);

      useAdminStore.getState().initializeSeason(activeSeasons, -5);
      expect(useAdminStore.getState().selectedSeasonId).toBe(4);

      useAdminStore.getState().initializeSeason(activeSeasons, 'invalid_param');
      expect(useAdminStore.getState().selectedSeasonId).toBe(4);
    });

    it('Fallback Precedence: When URL is invalid and stored season is null, falls back to first active season', () => {
      useAdminStore.getState().clearSeason();
      useAdminStore.getState().initializeSeason(activeSeasons, '999');
      expect(useAdminStore.getState().selectedSeasonId).toBe(3); // Season 3 is first active
    });

    it('Fallback Precedence: When stored season is no longer in activeSeasons, falls back to first active season', () => {
      useAdminStore.getState().setSelectedSeasonId(99); // Decommissioned season
      useAdminStore.getState().initializeSeason(activeSeasons);
      expect(useAdminStore.getState().selectedSeasonId).toBe(3);
    });

    it('Fallback Precedence: When stored season is marked is_active: false, falls back to first active season', () => {
      const seasonsWithInactive: SeasonRef[] = [
        { id: 99, name: 'Archived 2024', is_active: false },
        { id: 3, name: 'Liga Femenil 2026', is_active: true },
        { id: 4, name: 'Liga Tercera Fuerza 2026', is_active: true },
      ];

      useAdminStore.getState().setSelectedSeasonId(99);
      useAdminStore.getState().initializeSeason(seasonsWithInactive);
      // Since 99 has is_active === false, line 126 rejects it and falls back to first active (3)
      expect(useAdminStore.getState().selectedSeasonId).toBe(3);
    });

    it('Edge case: activeSeasons where the first element is inactive but later element is active', () => {
      const seasonsMixed: SeasonRef[] = [
        { id: 1, name: 'Old Season', is_active: false },
        { id: 2, name: 'Ancient Season', is_active: false },
        { id: 10, name: 'Active Libre', is_active: true },
      ];

      useAdminStore.getState().clearSeason();
      useAdminStore.getState().initializeSeason(seasonsMixed);
      // find(s => s.is_active !== false) will pick Season 10
      expect(useAdminStore.getState().selectedSeasonId).toBe(10);
    });

    it('Edge case: activeSeasons contains all inactive seasons', () => {
      const allInactive: SeasonRef[] = [
        { id: 1, name: 'Season 1', is_active: false },
        { id: 2, name: 'Season 2', is_active: false },
      ];

      useAdminStore.getState().clearSeason();
      useAdminStore.getState().initializeSeason(allInactive);
      // Fallback is activeSeasons[0] (Season 1)
      expect(useAdminStore.getState().selectedSeasonId).toBe(1);
    });

    it('Edge case: empty activeSeasons array does not throw or alter state', () => {
      useAdminStore.getState().setSelectedSeasonId(4);
      expect(() => useAdminStore.getState().initializeSeason([])).not.toThrow();
      expect(useAdminStore.getState().selectedSeasonId).toBe(4);
    });
  });

  describe('4. Reload Persistence Empirical Simulation', () => {
    it('proves Season 4 survives simulated page reload (F5)', async () => {
      // Step 1: User selects Season 4
      useAdminStore.getState().setSelectedSeasonId(4);
      expect(useAdminStore.getState().selectedSeasonId).toBe(4);

      // Step 2: In localStorage, verify Zustand persist serialized Season 4
      const rawStored = localStorageMock.getItem(ADMIN_SEASON_STORAGE_KEY);
      expect(rawStored).toBeTruthy();

      // Step 3: Simulate browser reload by calling useAdminStore.persist.rehydrate()
      // which synchronously/asynchronously invokes safePersistStorage.getItem()
      await useAdminStore.persist.rehydrate();
      expect(useAdminStore.getState().selectedSeasonId).toBe(4);

      // Step 4: Component mounts, Supabase returns active seasons, calls initializeSeason
      useAdminStore.getState().initializeSeason(activeSeasons);

      // CRITICAL ASSERTION:
      // Season must NOT reset to 3 (which was the bug prior to M1).
      // It must strictly stay 4!
      expect(useAdminStore.getState().selectedSeasonId).toBe(4);
      expect(useAdminStore.getState().selectedSeasonId).not.toBe(3);
    });

    it('proves Season 10 (Libre) survives simulated reload', async () => {
      useAdminStore.getState().setSelectedSeasonId(10);
      const raw = localStorageMock.getItem(ADMIN_SEASON_STORAGE_KEY);
      expect(raw).toContain('"selectedSeasonId":10');

      // Simulate reload rehydration
      await useAdminStore.persist.rehydrate();
      expect(useAdminStore.getState().selectedSeasonId).toBe(10);

      // Mount & initialize
      useAdminStore.getState().initializeSeason(activeSeasons);
      expect(useAdminStore.getState().selectedSeasonId).toBe(10);
    });

    it('proves legacy raw string storage "11" migrates seamlessly on reload', () => {
      // Simulate legacy or manual storage having raw string "11"
      localStorageMock.setItem(ADMIN_SEASON_STORAGE_KEY, '11');

      // Rehydrate via safePersistStorage
      const rehydrated = safePersistStorage.getItem(ADMIN_SEASON_STORAGE_KEY);
      expect(rehydrated).toEqual({ state: { selectedSeasonId: 11 }, version: 0 });

      useAdminStore.setState({
        selectedSeasonId: 11,
        isHydrated: true,
      });

      useAdminStore.getState().initializeSeason(activeSeasons);
      expect(useAdminStore.getState().selectedSeasonId).toBe(11);
    });
  });

  describe('5. SSR Environment Safety', () => {
    it('returns null and does not throw when window is undefined (SSR)', () => {
      const originalWindow = (globalThis as unknown as { window?: unknown }).window;
      try {
        delete (globalThis as unknown as { window?: unknown }).window;

        expect(safePersistStorage.getItem(ADMIN_SEASON_STORAGE_KEY)).toBeNull();
        expect(() =>
          safePersistStorage.setItem(ADMIN_SEASON_STORAGE_KEY, {
            state: { selectedSeasonId: 4 },
            version: 0,
          })
        ).not.toThrow();
        expect(() => safePersistStorage.removeItem(ADMIN_SEASON_STORAGE_KEY)).not.toThrow();
      } finally {
        (globalThis as unknown as { window: unknown }).window = originalWindow;
      }
    });
  });
});
