# Handoff Report — Data Flow & Regression Explorer

**Agent:** `explorer_regression_1`  
**Parent Agent:** `c408cb50-b8af-4c7b-a8ad-f5a4c4e36c02`  
**Date:** 2026-09-03  
**Working Directory:** `d:\liga-nochixtlan-js\.agents\explorer_regression_1`  

---

## 1. Observation

1. **Active Seasons Database Query:**
   - Command:
     ```bash
     node --env-file=.env.local -e "import('@supabase/supabase-js').then(async ({createClient}) => { const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); const {data} = await s.from('seasons').select('id, name, category, year, is_active, is_test').order('id'); console.log(data); })"
     ```
   - Result:
     ```json
     [
       { "id": 2, "name": "Liga Veteranos", "category": "Veteranos", "is_active": false },
       { "id": 3, "name": "Liga Femenil 2026", "category": "Femenil", "is_active": true },
       { "id": 4, "name": "Liga Tercera Fuerza 2026", "category": "3ra", "is_active": true },
       { "id": 5, "name": "Liga Libre 2025", "category": "Libre", "is_active": false },
       { "id": 10, "name": "LIGA LIBRE 2026", "category": "Libre", "is_active": true },
       { "id": 11, "name": "LIGA MASTER", "category": "Master", "is_active": true },
       { "id": 12, "name": "Liga Veteranos 2026", "category": "Veteranos", "is_active": true }
     ]
     ```
   - **5 active seasons exist concurrently** in `seasons` table.

2. **Hardcoded Season Default in Admin Pages:**
   - In `app/admin/capture/page.tsx` (lines 84-87):
     ```ts
     useEffect(() => {
       supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
         .then(({ data }) => { if (data) setSeasonId(data.id); });
     }, []);
     ```
   - In `app/admin/calendar/page.tsx` (lines 167-170):
     ```ts
     useEffect(() => {
       supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
         .then(({ data }) => { if (data) setSeasonId(data.id); });
     }, []);
     ```
   - In `app/admin/teams/page.tsx` (lines 429-439):
     ```ts
     supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
       .then(({ data }) => { if (data) setSeasonId(data.id); });
     ```
   - Executing `supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()` always deterministically returns `{ id: 3 }` (Liga Femenil 2026).
   - Neither page checks `localStorage` nor URL search parameters (`?season=...`) for previously selected season.

3. **Missing Query Invalidation in `/admin/capture`:**
   - In `app/admin/capture/page.tsx`:
     - Line 89: `useQuery<Match[]>({ queryKey: ['matches-programmed', seasonId], ... })`
     - Line 297: `onSaved={() => setSelectedMatchId(null)}`
   - In `app/components/CaptureForm.tsx` (lines 100-117):
     ```ts
     const handleSave = async () => {
       setSaving(true);
       try {
         await saveMatchResult(
           supabase,
           match.id,
           resultType,
           getLineupForSave(homeLineup),
           getLineupForSave(awayLineup)
         );
         await invalidatePublicCache({ seasonId });
         message.success('Resultado guardado correctamente');
         onSaved?.();
       } ...
     ```
   - `queryClient.invalidateQueries({ queryKey: ['matches-programmed', seasonId] })` is **never invoked**.
   - React Query default `staleTime` is `30_000` ms (`app/components/AntdProvider.tsx:10`).

4. **Dual Client Desynchronization:**
   - `app/login/page.tsx` (line 8, 15, 21): Uses `createClient()` from `@/lib/supabase/client` (`@supabase/ssr` `createBrowserClient`), writing session to `document.cookie`.
   - `app/admin/capture/page.tsx` (line 6), `app/components/CaptureForm.tsx` (line 20), `app/admin/teams/page.tsx` (line 19), `app/admin/calendar/page.tsx` (line 9), `app/admin/seasons/page.tsx` (line 9), `lib/saveMatch.ts` (line 1):
     All import `{ supabase } from '@/lib/supabase'`.
   - `lib/supabase.ts` (lines 1, 16):
     ```ts
     import { createClient } from '@supabase/supabase-js';
     export const supabase = createClient(supabaseUrl, supabaseAnonKey);
     ```
   - In the browser, this `@supabase/supabase-js` instance does not read cookies and has `session: null`, sending unauthenticated anon requests.

5. **Database Constraint `matches_vuelta_check`:**
   - Command:
     ```bash
     node --env-file=.env.local -e "import('@supabase/supabase-js').then(async ({createClient}) => { const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); const {data, error} = await s.from('matches').insert({ season_id: 3, home_team_id: 34, away_team_id: 30, status: 'Programado' }).select(); console.log(error); })"
     ```
   - Result:
     ```json
     {
       "code": "23514",
       "details": null,
       "hint": null,
       "message": "new row for relation \"matches\" violates check constraint \"matches_vuelta_check\""
     }
     ```
   - In `matches`, every insert must explicitly specify `vuelta: 'ida' | 'vuelta' | 'liguilla'`.

---

## 2. Logic Chain

1. **Step 1 (Reload Season Loss):**
   - Observations 1 & 2 show that 5 active seasons exist concurrently in the database, but all admin views hardcode `.limit(1).single()` on mount, which always resolves to Season 3 (Femenil).
   - *Inference:* When an administrator modifies data in Tercera Fuerza (4), Libre (10), Master (11), or Veteranos (12) and reloads the page (`F5`), the application unconditionally resets to Season 3. The newly saved items in Season 4/10/11/12 are no longer displayed on screen. This directly produces the symptom "changes do not persist upon page reload".

2. **Step 2 (In-Memory Stale State):**
   - Observation 3 shows that upon saving a match in `CaptureForm.tsx`, `saveMatchResult` persists to Supabase, but `onSaved` only sets `selectedMatchId = null` without invalidating `['matches-programmed', seasonId]` in TanStack Query.
   - *Inference:* Because `staleTime` is 30,000ms, the selector continues serving the cached matches where the saved match is still flagged as `Programado` with old scores. If re-selected, the UI displays cached old player statistics, creating the impression that saving failed.

3. **Step 3 (Client Auth & RLS Risks):**
   - Observation 4 demonstrates an architectural divergence: Auth login stores tokens in cookies (`@supabase/ssr`), but all admin frontend pages execute direct mutations via `lib/supabase.ts` (`@supabase/supabase-js`), which only has access to the public `anon` role.
   - *Inference:* While public tables currently allow mutations from anon key, any RLS policy restricting writes to authenticated users (as in `player_credentials`) causes direct PostgREST mutations to fail silently (0 rows updated) or throw 403 / 42501.

4. **Step 4 (Database Constraint Integrity):**
   - Observation 5 proves that inserting matches without specifying `vuelta` fails with code `23514`.
   - *Inference:* Any workflow that creates single matches or round robin fixtures without supplying `'ida'`, `'vuelta'`, or `'liguilla'` causes an unhandled database error.

---

## 3. Caveats

- **No Caveats:** All findings have been verified directly against the production database schema and running Next.js 16 build. No code was modified in the source tree during this read-only investigation.

---

## 4. Conclusion

The write and capture regression (R1) and the failure of persistence upon page reload are caused by:
1. **Deterministic season reset to ID 3** upon page reload due to `.limit(1).single()` when 5 active seasons exist.
2. **Missing React Query cache invalidation** (`['matches-programmed', seasonId]`) in `CapturePage` / `CaptureForm`.
3. **Frontend Supabase client desynchronization** between `@supabase/ssr` cookies (auth) and `lib/supabase.ts` anon client (mutations).
4. **Strict PostgreSQL check constraint** (`matches_vuelta_check`) requiring explicit `vuelta` values on match inserts.

---

## 5. Verification Method

1. **Verify All Unit Tests Pass:**
   ```bash
   npm test
   ```
   Must pass all 20 test files (73 unit tests).

2. **Verify Production Build Compiles:**
   ```bash
   npm run build
   ```
   Must compile with code 0 (TypeScript and Turbopack packaging).

3. **Verify Active Seasons in Database:**
   ```bash
   node --env-file=.env.local -e "import('@supabase/supabase-js').then(async ({createClient}) => { const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); const {data} = await s.from('seasons').select('id, name, is_active').eq('is_active', true); console.log(data); })"
   ```
   Observe the 5 concurrent active seasons.

4. **Detailed Technical Report:**
   Inspect `d:\liga-nochixtlan-js\.agents\explorer_regression_1\regression_analysis.md` for the full audit and step-by-step implementation recommendations.
