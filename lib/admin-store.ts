import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';

export interface SeasonRef {
  id: number;
  name?: string;
  category?: string;
  is_active?: boolean;
}

export interface AdminStore {
  // State
  selectedSeasonId: number | null;
  isHydrated: boolean;

  // Actions
  setSelectedSeasonId: (seasonId: number | null) => void;
  initializeSeason: (
    activeSeasons: SeasonRef[],
    searchParamsSeason?: string | number | null
  ) => void;
  setHydrated: (hydrated: boolean) => void;
  clearSeason: () => void;
}

interface AdminStorePersistedState {
  selectedSeasonId: number | null;
}

export const ADMIN_SEASON_STORAGE_KEY = 'selected_admin_season_id';

/**
 * SSR-safe, hybrid storage that seamlessly handles both:
 * 1. Standard Zustand JSON: {"state":{"selectedSeasonId":4},"version":0}
 * 2. Raw string/number: "4" (from legacy fixtures or manual test storage)
 */
export const safePersistStorage: PersistStorage<AdminStorePersistedState> = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(name);
      if (!raw) return null;

      // 1. Attempt JSON parse (standard Zustand format)
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && 'state' in parsed) {
          const stateObj = (parsed as { state?: { selectedSeasonId?: unknown } }).state;
          const rawId = stateObj?.selectedSeasonId;
          const id =
            typeof rawId === 'number' && Number.isFinite(rawId) && rawId > 0
              ? rawId
              : null;
          return { state: { selectedSeasonId: id }, version: (parsed as { version?: number }).version ?? 0 };
        }
      } catch {
        // Not a JSON object, proceed to raw number parsing
      }

      // 2. Fallback to raw string / integer (e.g. "4")
      const parsedNum = parseInt(raw, 10);
      if (!Number.isNaN(parsedNum) && parsedNum > 0) {
        return { state: { selectedSeasonId: parsedNum }, version: 0 };
      }

      return null;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(name, JSON.stringify(value));
    } catch {
      // Storage quota or security error in restricted iframe/browser
    }
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Storage error
    }
  },
};

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      selectedSeasonId: null,
      isHydrated: false,

      setSelectedSeasonId: (seasonId: number | null) => {
        const validId =
          typeof seasonId === 'number' && Number.isFinite(seasonId) && seasonId > 0
            ? seasonId
            : null;
        set({ selectedSeasonId: validId });
      },

      initializeSeason: (
        activeSeasons: SeasonRef[],
        searchParamsSeason?: string | number | null
      ) => {
        if (!Array.isArray(activeSeasons) || activeSeasons.length === 0) {
          return;
        }

        // 1. Precedence 1: Explicit URL parameter ?season=<id>
        if (searchParamsSeason !== undefined && searchParamsSeason !== null && searchParamsSeason !== '') {
          const parsedUrl =
            typeof searchParamsSeason === 'number'
              ? searchParamsSeason
              : parseInt(String(searchParamsSeason), 10);

          if (!Number.isNaN(parsedUrl) && activeSeasons.some((s) => s.id === parsedUrl)) {
            set({ selectedSeasonId: parsedUrl });
            return;
          }
        }

        // 2. Precedence 2: Current / Persisted state in store
        const current = get().selectedSeasonId;
        if (current !== null && activeSeasons.some((s) => s.id === current && s.is_active !== false)) {
          // Current persisted choice is still a valid active season; retain it!
          return;
        }

        // 3. Precedence 3: Fallback to the first active season
        const firstActive = activeSeasons.find((s) => s.is_active !== false) ?? activeSeasons[0];
        set({ selectedSeasonId: firstActive?.id ?? null });
      },

      setHydrated: (hydrated: boolean) => set({ isHydrated: hydrated }),

      clearSeason: () => set({ selectedSeasonId: null }),
    }),
    {
      name: ADMIN_SEASON_STORAGE_KEY,
      storage: safePersistStorage,
      partialize: (state) => ({ selectedSeasonId: state.selectedSeasonId }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
