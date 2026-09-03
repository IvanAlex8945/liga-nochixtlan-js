# Handoff Report: M1 Challenger 1 — Store & Persistence Stress Testing

**Agent**: M1 Challenger 1 (`teamwork_preview_challenger_m1_1`)  
**Mission**: Adversarially challenge `lib/admin-store.ts` and active season persistence across corrupted storage, rapid switching, precedence resolution, and page reload survival.  
**Verdict**: **APPROVE**  
**Date**: 2026-09-03  

---

## 1. Observation

### 1.1. Elimination of Deterministic On-Mount Reset Bug
Prior to M1, an unconditional query existed in 5 administrative pages (`app/admin/capture/page.tsx`, `app/admin/calendar/page.tsx`, `app/admin/teams/page.tsx`, `app/admin/eligibility/page.tsx`, and `app/admin/page.tsx`):
```tsx
useEffect(() => {
  supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
    .then(({ data }) => { if (data) setSeasonId(data.id); });
}, []);
```
Direct codebase inspection verifies that this query has been completely removed across all 5 admin pages. `grep_search` for `.limit(1)` in `app/admin` returned 0 matches.

Instead, all admin pages now bind directly to the Zustand store:
- `app/admin/calendar/page.tsx:149`: `const seasonId = useAdminStore((s) => s.selectedSeasonId);`
- `app/admin/capture/page.tsx:81`: `const seasonId = useAdminStore((s) => s.selectedSeasonId);`
- `app/admin/teams/page.tsx:176`: `const seasonId = useAdminStore((s) => s.selectedSeasonId);`
- `app/admin/eligibility/page.tsx:19`: `const seasonId = useAdminStore((s) => s.selectedSeasonId);`
- `app/admin/page.tsx:37`: `const seasonId = useAdminStore((s) => s.selectedSeasonId);`

### 1.2. Store Implementation in `lib/admin-store.ts`
- Line 37-87: Custom `safePersistStorage` adapter implementing `getItem`, `setItem`, and `removeItem` with SSR detection (`typeof window === 'undefined'`), JSON parsing validation, and fallback parsing for legacy raw strings (`parseInt(raw, 10)`).
- Line 95-101: `setSelectedSeasonId` enforces positive finite numbers (`typeof seasonId === 'number' && Number.isFinite(seasonId) && seasonId > 0 ? seasonId : null`), sanitizing invalid inputs to `null`.
- Line 103-134: `initializeSeason` implements a 3-tier precedence hierarchy:
  - **Tier 1 (URL)**: `searchParamsSeason` if valid and in `activeSeasons`.
  - **Tier 2 (Persisted Storage)**: `get().selectedSeasonId` if currently active.
  - **Tier 3 (Fallback)**: First active season in `activeSeasons`.

### 1.3. Component Integration in `app/components/SeasonSelector.tsx`
- Lines 55-60:
```tsx
useEffect(() => {
  if (seasons.length > 0) {
    const activeOnly = seasons.filter((s) => s.is_active);
    initializeSeason(activeOnly.length > 0 ? activeOnly : seasons);
  }
}, [seasons, initializeSeason]);
```
`SeasonSelector` invokes `initializeSeason(activeOnly)` without passing a second `searchParamsSeason` argument.

### 1.4. Empirical Stress Testing (`tests/admin-store-stress.test.ts`)
An adversarial stress testing suite containing 46 tests was authored and executed via Vitest (`npx vitest run tests/admin-store-stress.test.ts`).
Command output:
```
 ✓ tests/admin-store-stress.test.ts (46 tests) 32ms
 Test Files  1 passed (1)
      Tests  46 passed (46)
```

### 1.5. Full Project Verification
- `npm test`: 27 test files passed, 226 tests passed, 0 failures.
- `npx eslint app lib tests/admin-store.test.ts tests/admin-store-stress.test.ts`: Exit code 0, 0 errors, 0 warnings.
- `npm run build`: Exit code 0, compiled successfully in 18.0s, generated all 28/28 static and dynamic routes.

---

## 2. Logic Chain

1. **Storage Corruption Resilience**:
   - `safePersistStorage` was stressed with 29 adversarial inputs, including truncated JSON (`{"state":{"selectedSeasonId":`), unclosed braces, single quotes, non-numeric strings (`"undefined"`, `"null"`, `"NaN"`, `"Infinity"`), HTML injection payloads (`<script>alert(1)</script>`), negative numbers, zero, floats, non-object states, and array payloads.
   - In all 29 cases, `safePersistStorage.getItem` safely swallowed syntax errors without crashing the runtime and returned either `null` or a sanitized positive integer.
   - Storage errors (`QuotaExceededError`, `SecurityError`) simulated on `getItem`, `setItem`, and `removeItem` were cleanly caught and handled without throwing unhandled exceptions to UI callers.

2. **Rapid Concurrency & State Determinism**:
   - A stress test executing 1,000 rapid season transitions in a tight loop cycling across valid IDs (3, 4, 10, 11, 12) and `null` demonstrated deterministic state retention.
   - Synchronous subscriber notifications were confirmed across multiple simultaneous store subscribers; no dropped transitions or divergent state occurred.
   - LocalStorage serialization matched the terminal state at every cycle.

3. **Precedence Hierarchy Verification**:
   - The 3-tier precedence in `initializeSeason` was tested:
     - Tier 1: Valid URL search param (`'10'`, `11`) successfully overrides stored state (`Season 4`) and fallback (`Season 3`).
     - Tier 2: When URL param is missing (`undefined`, `null`, `''`) or points to an invalid/non-existent ID (`'999'`, `-5`), the persisted store selection (`Season 4`) is retained.
     - Tier 3: When stored state is `null` or points to a season that has been deactivated (`is_active: false`) or removed from the database, it falls back cleanly to the first active season.

4. **Empirical Reload Persistence Verification**:
   - The reload lifecycle was empirically simulated:
     1. User selects Season 4 -> persisted to localStorage.
     2. Page reload simulated -> Zustand rehydrates state from localStorage via `useAdminStore.persist.rehydrate()`.
     3. Active seasons query resolves with `[3, 4, 10, 11, 12]`, triggering `initializeSeason(activeSeasons)`.
     4. Because `Season 4` is present in `activeSeasons`, `initializeSeason` preserves `Season 4` without mutating state.
     5. The deterministic reset to Season 3 is completely eliminated.
   - The same test was validated for Season 10 (Libre) and legacy raw string storage (`"11"`).

---

## 3. Caveats

1. **URL Precedence in UI Components (Observation for Milestone 2)**:
   - While `lib/admin-store.ts` implements Tier 1 URL precedence in `initializeSeason(activeSeasons, searchParamsSeason)`, `SeasonSelector.tsx:58` currently calls `initializeSeason(activeOnly)` without reading or passing URL query parameters (`?season=X`).
   - In Next.js App Router, using `useSearchParams()` requires wrapping consumers in `<Suspense>` boundaries to avoid de-opting static route compilation.
   - As a result, opening a URL like `/admin/calendar?season=10` currently retains the user's previously persisted localStorage season rather than overriding it via the URL.
   - *Recommendation for M2*: When the contextual Topbar is implemented in Milestone 2, wrap the Topbar season sync in a `<Suspense>` boundary or extract `window.location.search` inside the client `useEffect` of `SeasonSelector` to complete the URL sync loop.

2. **Cross-Tab Real-Time Storage Event Listening**:
   - Zustand's default `persist` middleware synchronizes state on page initialization and reload; it does not attach a native window `'storage'` event listener to immediately synchronize state across two concurrently open tabs without a refresh. This is standard behavior for client stores and does not impact single-tab workflows.

---

## 4. Conclusion

**Verdict: APPROVE**

The data layer and active season persistence implementation in `lib/admin-store.ts` is robust, SSR-safe, resilient against malformed/adversarial localStorage payloads, and completely eliminates the active season reset bug on page reload across all administrative views. Production build (`npm run build`), ESLint (`npx eslint`), and the full test suite (226 tests passing) all verify cleanly.

---

## 5. Verification Method

To independently verify this evaluation:

1. **Run the Adversarial Stress Suite**:
   ```powershell
   npx vitest run tests/admin-store-stress.test.ts
   ```
   *Expected result*: 46 passed, 0 failed.

2. **Run Full Project Test Suite**:
   ```powershell
   npm test
   ```
   *Expected result*: 27 test files passed, 226 tests passed, 0 failures.

3. **Run Code & Stress Test Linter**:
   ```powershell
   npx eslint app lib tests/admin-store.test.ts tests/admin-store-stress.test.ts
   ```
   *Expected result*: 0 errors, 0 warnings.

4. **Run Production Compilation**:
   ```powershell
   npm run build
   ```
   *Expected result*: Next.js Turbopack build succeeds with code 0 (28/28 routes).
