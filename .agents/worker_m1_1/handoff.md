# Handoff Report: Milestone 1 — Persistence & Data Layer Repair

**Agent**: Implementation Worker M1 (`worker_m1_1`)  
**Mission**: Execute Milestone 1: Persistence & Data Layer Repair across 10 tasks defined in `DISPATCH.md`.  
**Date**: 2026-09-03  
**Target Files Owned & Modified**:
- `lib/admin-store.ts` (created)
- `lib/supabase.ts`
- `lib/supabase/client.ts`
- `app/components/SeasonSelector.tsx`
- `app/components/CaptureForm.tsx`
- `app/admin/capture/page.tsx`
- `app/admin/calendar/page.tsx`
- `app/admin/calendar/MissingMatchesModal.tsx`
- `app/admin/teams/page.tsx`
- `app/admin/seasons/page.tsx`
- `app/admin/eligibility/page.tsx`
- `app/admin/page.tsx`
- `tests/admin-store.test.ts` (created)

---

## 1. Observation

### 1.1. Pre-Implementation State
1. **Active Season Reset Bug**:
   Prior to this milestone, five admin pages executed an unconditional PostgreSQL query on mount:
   - `app/admin/capture/page.tsx`: lines 84-87
   - `app/admin/calendar/page.tsx`: lines 167-170
   - `app/admin/teams/page.tsx`: lines 428-440
   - `app/admin/eligibility/page.tsx`: lines 21-24
   - `app/admin/page.tsx`: lines 41-44
   Verbatim code:
   ```tsx
   useEffect(() => {
     supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
       .then(({ data }) => { if (data) setSeasonId(data.id); });
   }, []);
   ```
   Because PostgreSQL contains 5 active seasons (one per category: Femenil ID 3, Tercera Fuerza ID 4, Libre ID 10, Master ID 11, Veteranos ID 12), every browser reload (`F5`) or route transition forcibly reset the active view to Season 3 ("Liga Femenil 2026"), hiding any newly saved matches, teams, or rosters in Season 4 or Season 10.

2. **Supabase Client Authentication Fragmentation**:
   - `lib/supabase/client.ts`: Used `@supabase/ssr` `createBrowserClient`, storing tokens in HTTP cookies.
   - `lib/supabase.ts`: Instantiated static `@supabase/supabase-js` `createClient` using `anon` key, with no access to session cookies.
   - All 13 admin components and mutation handlers imported from `lib/supabase.ts`, causing mutations to be dispatched as anonymous requests without authenticated user context.

3. **Stale Query Cache in Match Capture**:
   - `app/components/CaptureForm.tsx:100-118`: `handleSave` only called `invalidatePublicCache({ seasonId })` (`POST /api/admin/revalidate-public-data`), omitting any TanStack Query client cache invalidation.
   - `AntdProvider.tsx` defines global query `staleTime: 30_000` (30 seconds). Consequently, saved matches remained listed as `Programado` when returning to the match selection dropdown.
   - `CaptureForm` save button had neither `loading={saving}` nor `disabled={saving}`, allowing rapid double-clicks to execute concurrent conflicting mutation calls.

4. **PostgreSQL Constraint `matches_vuelta_check`**:
   - Database constraint: `CHECK (vuelta IS NULL OR vuelta IN ('ida', 'vuelta', 'liguilla'))`.
   - In `app/admin/calendar/MissingMatchesModal.tsx:225`, missing mirror matches were given key `${audit.key}-mirror`, causing `attemptCreate` to blindly insert `vuelta: 'vuelta'`. When the pre-existing match was already a vuelta match, this attempted to insert duplicate vueltas and failed with error `23514`.

5. **Destructive Cascade Team Deletion vs. Soft-Delete (FK 23503)**:
   - In `app/admin/teams/page.tsx:723-750`, `deleteTeam` attempted to physically delete all `player_match_stats` and `matches` of the team, destroying historical league records in violation of zero data loss principles. Furthermore, teams with players threw unhandled PostgreSQL foreign key error `23503`.
   - In `app/admin/capture/page.tsx:130, 184`, playoff matches filtered out all players who did not meet the eligibility threshold (`sortPlayersByNumber(playersData.filter(p => eligibleSet.has(p.id)))`), completely removing them from the roster table and preventing the scoring table from recording attendance under special referee authorization.

---

## 2. Logic Chain

1. **Centralized Client State (`lib/admin-store.ts`)**:
   - Creating a centralized store using Zustand's `persist` middleware bound to localStorage key `'selected_admin_season_id'` preserves the administrator's selected season across reloads and route navigation.
   - Implementing `safePersistStorage` guards against SSR `window is not defined` exceptions and supports both standard Zustand JSON (`{"state":{"selectedSeasonId":4},"version":0}`) and raw string format (`"4"`).
   - Implementing 3-tier precedence in `initializeSeason`:
     - **Tier 1 (Highest)**: Valid `?season=<id>` URL query parameter.
     - **Tier 2 (Persisted)**: Currently stored active season.
     - **Tier 3 (Fallback)**: First active season in `activeSeasons`.
   - Replacing the five `.limit(1).single()` `useEffect` hooks with `useAdminStore((s) => s.selectedSeasonId)` completely eliminates the reload reset bug.
   - To comply with React 19 / Next.js 16 compiler standards and prevent `react-hooks/set-state-in-effect` lint errors, state adjustment when `seasonId` changes is performed during render (`if (seasonId !== prevSeasonId) { setPrevSeasonId(seasonId); resetDependentState(); }`).

2. **Supabase Client Unification**:
   - In `lib/supabase.ts`, `getSupabaseClient()` checks `typeof window !== 'undefined' && typeof window.document !== 'undefined'`. In browser runtime, it delegates to `@supabase/ssr` `createBrowserClient`, ensuring all client-side queries and mutations send the authenticated JWT cookie session.
   - In server contexts (e.g. `lib/public-data.ts`), it falls back to `@supabase/supabase-js` `createClient(url, anonKey)` without throwing SSR cookie errors.
   - `lib/supabase/client.ts` exports `export const supabase = createClient()`, providing full singleton parity.

3. **TanStack Query Invalidation & Double-Submit Protection**:
   - In `CaptureForm.tsx`, `useQueryClient` invalidates:
     - `['matches-programmed']` & `['matches-programmed', seasonId]`
     - `['matches', seasonId]`
     - `['stats', seasonId]`
     - `['standings', seasonId]`
     - `['season-detail', seasonId]`
     - `['match', match.id]`
     - `['players-capture-home']` & `['players-capture-away']`
     - `['eligibility']`
   - The primary `<Button>` in `CaptureForm.tsx` received `loading={saving}` and `disabled={saving}`.

4. **Constraint & Soft-Delete Compliance**:
   - In `MissingMatchesModal.tsx`, `missingVuelta` is dynamically calculated: `existingMatch?.vuelta === 'vuelta' ? 'ida' : 'vuelta'`. Explicit `vuelta: 'ida'` and `vuelta: 'vuelta'` are set on inserted rows.
   - In `app/admin/teams/page.tsx:deleteTeam`, destructive match and stats deletions were removed. On error `23503`, the team is safely updated to `status: 'Baja'` and its associated players are marked `is_active: false`.
   - In `app/admin/capture/page.tsx`, the hard `.filter(p => eligibleSet.has(p.id))` was removed; all active players are displayed, sorted with eligible players first, displaying eligibility badges while remaining interactable for roster capture.

---

## 3. Caveats

1. **Pre-existing ESLint Warnings in `tests/e2e/helpers/test-fixtures.ts`**:
   - Running full-project `npm run lint` evaluates untracked test fixtures created by the separate E2E testing track (`tests/e2e/helpers/test-fixtures.ts`), which contain 20 `@typescript-eslint/no-explicit-any` errors.
   - In accordance with exclusive file ownership, this worker did NOT modify files outside its assigned scope.
   - Running ESLint on all project source code and newly added test files (`npx eslint app lib tests/admin-store.test.ts`) exits with code 0 (0 errors, 0 warnings).
2. **PostgreSQL RLS Policies**:
   - In production Supabase, RLS policies on `matches` and `player_match_stats` permit authenticated administrative users. With the unified client passing cookie JWTs, mutations succeed under authenticated role.

---

## 4. Conclusion

All 10 tasks assigned in `DISPATCH.md` have been fully and genuinely implemented, verified, and documented:
- `lib/admin-store.ts` created with Zustand persist and safe storage.
- `lib/supabase.ts` and `lib/supabase/client.ts` unified.
- `SeasonSelector.tsx` integrated with backward compatibility.
- All on-mount `.limit(1).single()` resets removed from all 5 admin pages.
- TanStack Query invalidation and double-click prevention implemented in `CaptureForm.tsx`.
- `MissingMatchesModal.tsx` constraint compliance ensured.
- Team soft-delete on FK 23503 and Liguilla roster capture unblocking implemented.
- 16 unit tests created in `tests/admin-store.test.ts` (100% passing).
- Production build (`npm run build`) succeeded with exit code 0.

---

## 5. Verification Method

To independently verify these changes:

1. **Run Unit & Integration Test Suite**:
   ```powershell
   npm test
   ```
   *Expected result*: 25 test files passed, 167 tests passed, 0 failures.

2. **Run ESLint on Owned Source & Test Files**:
   ```powershell
   npx eslint app lib tests/admin-store.test.ts
   ```
   *Expected result*: Exit code 0, 0 errors, 0 warnings.

3. **Run Production Build**:
   ```powershell
   npm run build
   ```
   *Expected result*: Turbopack compilation succeeded, TypeScript finished in 7.9s, 28/28 static pages generated, exit code 0.

4. **Verify Store Persistence**:
   Inspect `tests/admin-store.test.ts` or execute:
   ```powershell
   npx vitest run tests/admin-store.test.ts
   ```
   *Expected result*: All 16 tests pass, validating persistence, 3-tier precedence, fallback to first active season, URL search param override, and safe storage error handling.
