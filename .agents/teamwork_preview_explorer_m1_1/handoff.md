# Handoff Report: Zustand Admin Store Architecture (Milestone 1 - Item 1)

**Agent:** M1 Explorer 1 (`teamwork_preview_explorer_m1_1`)  
**Mission:** Analyze Milestone 1 Item 1: Centralizing active season state in `lib/admin-store.ts` using Zustand with persist middleware, tracing admin page usage, defining store contracts, hydration safety, and worker implementation plan.  
**Target Module:** `lib/admin-store.ts`, `app/components/SeasonSelector.tsx`, and admin pages.  
**Date:** 2026-09-03  

---

## 1. Observation

### 1.1. Package & Environment Setup
- `package.json:27`: `"zustand": "^5.0.12"` is already installed as a production dependency.
- `package.json:22`: `"next": "16.2.9"` (App Router).
- `package.json:24`: `"react": "19.2.7"`.
- `tests/`: 21 test files with 118 tests currently passing via `npm test` (`vitest run`).
- `tests/e2e/tier1-features.test.ts:120-176`: Existing test suite defines the contract for Feature 2 ("Reload Season Retention") using `createAdminStoreSimulator()` in `tests/e2e/helpers/test-fixtures.ts:350-398`.

### 1.2. Direct Trace of Admin Pages Using `.limit(1).single()`
Five admin pages currently query Supabase on mount using `.limit(1).single()`, forcibly defaulting `seasonId` to the first active record returned by PostgreSQL (Season ID 3: "Liga Femenil 2026"):

1. **`app/admin/capture/page.tsx`**
   - Line 80: `const [seasonId, setSeasonId] = useState<number | null>(null);`
   - Lines 84–87:
     ```tsx
     useEffect(() => {
       supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
         .then(({ data }) => { if (data) setSeasonId(data.id); });
     }, []);
     ```
   - Line 234: `<SeasonSelector value={seasonId} onChange={(id) => { setSeasonId(id); setSelectedMatchId(null); setSelectedJornada(null); }} />`
   - Downstream queries: `useQuery(['matches-programmed', seasonId])`, `useQuery(['players-capture-home', matchId, seasonId])`, `useQuery(['players-capture-away', matchId, seasonId])`.

2. **`app/admin/calendar/page.tsx`**
   - Line 148: `const [seasonId, setSeasonId] = useState<number | null>(null);`
   - Lines 167–170:
     ```tsx
     useEffect(() => {
       supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
         .then(({ data }) => { if (data) setSeasonId(data.id); });
     }, []);
     ```
   - Line 1112: `<SeasonSelector value={seasonId} onChange={setSeasonId} style={{ marginTop: 8 }} />`
   - Downstream queries: `useQuery(['teams-active', seasonId])`, `useQuery(['matches', seasonId])`.

3. **`app/admin/teams/page.tsx`**
   - Line 410 (local state): `const [seasonId, setSeasonId] = useState<number | null>(null);`
   - Lines 428–440:
     ```tsx
     useEffect(() => {
       supabase
         .from('seasons')
         .select('id')
         .eq('is_active', true)
         .limit(1)
         .single()
         .then(({ data }) => {
           if (data) {
             setSeasonId(data.id);
           }
         });
     }, []);
     ```
   - Line 1162: `<SeasonSelector value={seasonId} onChange={setSeasonId} style={{ marginTop: 8 }} />`
   - Downstream queries: `useQuery(['season-detail', seasonId])`, `useQuery(['teams', seasonId])`, `useQuery(['players', seasonId])`, `useQuery(['player-credentials', seasonId])`.

4. **`app/admin/eligibility/page.tsx`**
   - Line 18: `const [seasonId, setSeasonId] = useState<number | null>(null);`
   - Lines 21–24:
     ```tsx
     useEffect(() => {
       supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
         .then(({ data }) => { if (data) setSeasonId(data.id); });
     }, []);
     ```
   - Line 93: `<SeasonSelector value={seasonId} onChange={(id) => { setSeasonId(id); setSelectedTeamId(null); }} style={{ marginTop: 8 }} />`
   - Downstream queries: `useQuery(['season-detail', seasonId])`, `useQuery(['teams', seasonId])`, `useQuery(['matches', seasonId])`, `useQuery(['stats', seasonId])`, `useQuery(['eligibility', selectedTeamId, seasonId])`.

5. **`app/admin/page.tsx` (Dashboard)**
   - Line 37: `const [seasonId, setSeasonId] = useState<number | null>(null);`
   - Lines 41–44:
     ```tsx
     useEffect(() => {
       supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
         .then(({ data }) => { if (data) setSeasonId(data.id); });
     }, []);
     ```
   - Line 70: `<SeasonSelector value={seasonId} onChange={setSeasonId} />`
   - Downstream queries: `useQuery(['season-detail', seasonId])`.

6. **`app/admin/seasons/page.tsx` (Seasons Management)**
   - Lines 73–89: `activateMutation` sets `is_active: false` for all seasons in category, then `is_active: true` for the selected season. Invalidates `['seasons']`, `['active-season']`, `['seasons-selector']`.
   - Lines 91–103: `deleteMutation` cascades delete of season.

7. **`lib/validators.ts`**
   - Line 13: `checkPrerequisites` also queries `.from('seasons').select('id').eq('is_active', true).limit(1).single()`. (Currently helper function; should accept optional `seasonId`).

### 1.3. Zustand v5 SSR & Hydration Mechanics
- `node_modules/zustand/esm/react.mjs:5-13`:
  ```js
  function useStore(api, selector = identity) {
    const slice = React.useSyncExternalStore(
      api.subscribe,
      React.useCallback(() => selector(api.getState()), [api, selector]),
      React.useCallback(() => selector(api.getInitialState()), [api, selector])
    );
    React.useDebugValue(slice);
    return slice;
  }
  ```
  Zustand v5's `useStore` natively binds to React's `useSyncExternalStore`.
- `node_modules/zustand/esm/middleware.mjs:376`:
  `api.getInitialState = () => configResult;` returns the unhydrated initial state (`selectedSeasonId: null`).
- In Next.js App Router SSR:
  Direct access to `window.localStorage` throws a `ReferenceError: window is not defined` during server prerender if not guarded by `typeof window !== 'undefined'`.
- Storage formats observed:
  - Default Zustand persist writes: `{"state":{"selectedSeasonId":4},"version":0}`
  - Test fixture simulator (`test-fixtures.ts:358`) writes raw string: `"4"` under key `'selected_admin_season_id'`.

---

## 2. Logic Chain

1. **Root Cause of Apparent Data Loss on Reload:**
   - In production PostgreSQL, 5 seasons have `is_active: true` concurrently (one per category: Femenil ID 3, 3ra Fuerza ID 4, Libre ID 10, Master ID 11, Veteranos ID 12).
   - In `/admin/capture`, `/admin/calendar`, `/admin/teams`, each page has an isolated `useState<number | null>(null)` for `seasonId`.
   - On page load or browser reload (`F5`), each page's `useEffect` executes `.limit(1).single()`, which deterministically queries PostgreSQL without `ORDER BY`, resolving to `{ id: 3 }` ("Liga Femenil 2026").
   - If an admin was operating in Tercera Fuerza (ID 4), saves a match or team, and refreshes the browser, the page forcibly switches to Season 3. The newly saved items in Season 4 are hidden because the queries filter by `season_id: 3`. This creates the false perception that data was not persisted in the database.

2. **Decoupled Page State Causes Inter-page Desynchronization:**
   - Because each page holds its own `useState`, selecting Season 4 on `/admin/teams` does NOT carry over when the user navigates to `/admin/calendar` or `/admin/capture`. Navigating to another page resets the view to Season 3.
   - Centralizing the active season in a single client store shared by all admin routes eliminates this cross-page desynchronization.

3. **Storage & Hydration Safety in Next.js App Router:**
   - Zustand v5's `persist` middleware with `name: 'selected_admin_season_id'` can persist the selected season to `localStorage`.
   - To prevent SSR crashes during `next build` or server rendering, storage access must be wrapped in an SSR-safe adapter (`safePersistStorage`) that checks `typeof window !== 'undefined'` and catches any `SecurityError` (e.g., Safari private mode).
   - Because existing test simulators write a plain string `"4"` to `localStorage['selected_admin_season_id']`, while standard Zustand writes `{"state":{"selectedSeasonId":4},"version":0}`, the storage adapter's `getItem` must support **both formats** transparently.
   - By leveraging `onRehydrateStorage`, the store tracks `isHydrated: true`, allowing components to know when hydration from `localStorage` is complete.

4. **Multi-tier Precedence for Season Selection (`initializeSeason`):**
   - **Tier 1 (Highest Precedence):** Explicit URL search parameter (e.g. `?season=10`). If provided, parsed as an integer, and valid in `activeSeasons`, it sets `selectedSeasonId: 10` and persists it.
   - **Tier 2 (Persisted Choice):** If the store already holds a valid `selectedSeasonId` from `localStorage` that is still present in `activeSeasons` (and active), retain it. Do NOT overwrite it with the first season!
   - **Tier 3 (Fallback):** If the store has `null`, an invalid ID, or an ID of a season that is no longer active, fallback to the first active season: `activeSeasons[0].id`.

---

## 3. Caveats

1. **Scope Boundary:** This handoff provides the complete architectural design, contract specifications, and step-by-step code implementation plan for Milestone 1 Item 1. It does NOT modify existing source files directly (adhering to read-only Explorer rules). The Worker will apply the changes.
2. **Public Website Segregation:** The public website (`app/page.tsx`, `lib/public-data.ts`) has its own season selection and cache rules (`public-cache-keys.ts`). `lib/admin-store.ts` is scoped exclusively to the Admin Panel (`/admin/*`) and must NOT affect public caching or public page views.
3. **Multi-category Active Seasons:** The system deliberately allows concurrent active seasons (one per category). The admin store represents the *currently viewed/selected season in the admin session*, not a restriction that only one season can exist in PostgreSQL.

---

## 4. Conclusion & Concrete Specification

### 4.1. File to Create: `lib/admin-store.ts`

```typescript
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
          const stateObj = parsed.state as { selectedSeasonId?: unknown };
          const id =
            typeof stateObj.selectedSeasonId === 'number' &&
            Number.isFinite(stateObj.selectedSeasonId) &&
            stateObj.selectedSeasonId > 0
              ? stateObj.selectedSeasonId
              : null;
          return { state: { selectedSeasonId: id }, version: parsed.version ?? 0 };
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
        if (searchParamsSeason !== undefined && searchParamsSeason !== null) {
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
```

### 4.2. File to Update: `app/components/SeasonSelector.tsx`
Upgrade to dual-mode (backwards-compatible with controlled props, yet automatically store-driven when props are omitted):
```tsx
'use client';

import { useEffect } from 'react';
import { Select, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAdminStore } from '@/lib/admin-store';

const { Text } = Typography;

interface Props {
  value?: number | null;
  onChange?: (id: number) => void;
  includeInactive?: boolean;
  style?: React.CSSProperties;
}

export interface SeasonOption {
  id: number;
  name: string;
  category: string;
  is_active: boolean;
}

export default function SeasonSelector({
  value: propValue,
  onChange: propOnChange,
  includeInactive = false,
  style,
}: Props) {
  const storeSeasonId = useAdminStore((s) => s.selectedSeasonId);
  const setStoreSeasonId = useAdminStore((s) => s.setSelectedSeasonId);
  const initializeSeason = useAdminStore((s) => s.initializeSeason);

  const value = propValue !== undefined ? propValue : storeSeasonId;

  const { data: seasons = [] } = useQuery<SeasonOption[]>({
    queryKey: ['seasons-selector', includeInactive ? 'all' : 'active'],
    queryFn: async () => {
      let query = supabase
        .from('seasons')
        .select('id, name, category, is_active')
        .order('id', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  // Automatically initialize season store when active seasons load
  useEffect(() => {
    if (seasons.length > 0) {
      const activeOnly = seasons.filter((s) => s.is_active);
      initializeSeason(activeOnly.length > 0 ? activeOnly : seasons);
    }
  }, [seasons, initializeSeason]);

  const handleChange = (id: number) => {
    if (propOnChange) {
      propOnChange(id);
    }
    setStoreSeasonId(id);
  };

  const options = seasons.map((s) => ({
    label: `${s.name} (${s.category})${s.is_active ? ' ✓' : ''}`,
    value: s.id,
  }));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      <Text style={{ color: '#888', whiteSpace: 'nowrap', fontSize: 13 }}>Temporada:</Text>
      <Select
        value={value}
        onChange={handleChange}
        options={options}
        style={{ minWidth: 240 }}
        placeholder="Seleccionar temporada"
        styles={{ popup: { root: { background: '#1a1a1a', borderColor: '#333' } } }}
        showSearch
        filterOption={(input, opt) =>
          (opt?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
        }
      />
    </div>
  );
}
```

### 4.3. Specific Changes for the 5 Admin Pages

| File | Current State | Replacement with Zustand Store | Cleanup Action |
|---|---|---|---|
| `app/admin/capture/page.tsx` | `const [seasonId, setSeasonId] = useState<number | null>(null);` + `useEffect` with `.limit(1).single()` (lines 80–87) | `const seasonId = useAdminStore((s) => s.selectedSeasonId);`<br>`const setSeasonId = useAdminStore((s) => s.setSelectedSeasonId);` | Delete `.limit(1).single()` `useEffect`. Add `useEffect(() => { setSelectedMatchId(null); setSelectedJornada(null); }, [seasonId]);` |
| `app/admin/calendar/page.tsx` | `const [seasonId, setSeasonId] = useState<number | null>(null);` + `useEffect` with `.limit(1).single()` (lines 148, 167–170) | `const seasonId = useAdminStore((s) => s.selectedSeasonId);`<br>`const setSeasonId = useAdminStore((s) => s.setSelectedSeasonId);` | Delete `.limit(1).single()` `useEffect`. Add `useEffect(() => { setTeamFilterIds([]); setSelectedTeamCalendarId(null); }, [seasonId]);` |
| `app/admin/teams/page.tsx` | `const [seasonId, setSeasonId] = useState<number | null>(null);` + `useEffect` with `.limit(1).single()` (lines 428–440) | `const seasonId = useAdminStore((s) => s.selectedSeasonId);`<br>`const setSeasonId = useAdminStore((s) => s.setSelectedSeasonId);` | Delete `.limit(1).single()` `useEffect`. |
| `app/admin/eligibility/page.tsx` | `const [seasonId, setSeasonId] = useState<number | null>(null);` + `useEffect` with `.limit(1).single()` (lines 18, 21–24) | `const seasonId = useAdminStore((s) => s.selectedSeasonId);`<br>`const setSeasonId = useAdminStore((s) => s.setSelectedSeasonId);` | Delete `.limit(1).single()` `useEffect`. Add `useEffect(() => setSelectedTeamId(null), [seasonId]);` |
| `app/admin/page.tsx` (Dashboard) | `const [seasonId, setSeasonId] = useState<number | null>(null);` + `useEffect` with `.limit(1).single()` (lines 37, 41–44) | `const seasonId = useAdminStore((s) => s.selectedSeasonId);`<br>`const setSeasonId = useAdminStore((s) => s.setSelectedSeasonId);` | Delete `.limit(1).single()` `useEffect`. |
| `app/admin/seasons/page.tsx` | `activateMutation` & `deleteMutation` (lines 73–103) | When activating: `useAdminStore.getState().setSelectedSeasonId(seasonId);`<br>When deleting: `if (useAdminStore.getState().selectedSeasonId === id) useAdminStore.getState().clearSeason();` | Automatically syncs active season selection when seasons are created, activated, or deleted. |

---

## 5. Verification Method

### 5.1. Unit Test Suite (`tests/admin-store.test.ts`)
The Worker should add `tests/admin-store.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useAdminStore, ADMIN_SEASON_STORAGE_KEY } from '../lib/admin-store';

describe('AdminStore (lib/admin-store.ts)', () => {
  const activeSeasons = [
    { id: 3, name: 'Liga Femenil 2026', is_active: true },
    { id: 4, name: 'Liga Tercera Fuerza 2026', is_active: true },
    { id: 10, name: 'LIGA LIBRE 2026', is_active: true },
  ];

  beforeEach(() => {
    localStorage.clear();
    useAdminStore.getState().clearSeason();
  });

  it('initializes with null selectedSeasonId and false isHydrated', () => {
    expect(useAdminStore.getState().selectedSeasonId).toBeNull();
  });

  it('persists selected season to localStorage under selected_admin_season_id', () => {
    useAdminStore.getState().setSelectedSeasonId(4);
    expect(useAdminStore.getState().selectedSeasonId).toBe(4);
    const stored = localStorage.getItem(ADMIN_SEASON_STORAGE_KEY);
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

  it('falls back to stored season if URL param refers to non-existent season', () => {
    useAdminStore.getState().setSelectedSeasonId(4);
    useAdminStore.getState().initializeSeason(activeSeasons, '999');
    expect(useAdminStore.getState().selectedSeasonId).toBe(4);
  });
});
```

### 5.2. Verification Commands
Execute from project root:
1. `npm test`: Must run Vitest and pass all unit & E2E tests (including `tests/admin-store.test.ts` and `tests/e2e/tier1-features.test.ts`).
2. `npm run build`: Must complete Next.js compilation with exit code 0, verifying zero SSR hydration or TypeScript build errors.
3. `npm run lint`: Must pass with exit code 0.

### 5.3. Invalidation Conditions
- If any admin page continues to execute `supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()`, the regression will persist.
- If `localStorage` access is called unconditionally without `typeof window !== 'undefined'`, Next.js server-side build will crash.
- If `initializeSeason` resets `selectedSeasonId` to `activeSeasons[0].id` even when `selectedSeasonId` is already set to an active season, the fix is invalid.
