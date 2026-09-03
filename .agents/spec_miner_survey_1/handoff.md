# Handoff Report — Admin Spec Miner

**Agent Folder:** `d:\liga-nochixtlan-js\.agents\spec_miner_survey_1`  
**Target Delivery File:** `d:\liga-nochixtlan-js\.agents\spec_miner_survey_1\spec_inventory.md`  
**Date:** 2026-09-03  
**Status:** Complete (Hard Handoff)

---

## 1. Observation

1. **Reference Specifications Analyzed:**
   - `MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md`: 1,248 lines covering mission, absolute constraints (zero data loss, no DB reset, no secrets alteration, no public site modifications), subagent roles, two phases (Etapa A: Reparar, Etapa B: Rediseñar), App Shell requirements, and screen-by-screen UX criteria.
   - `.agents/ORIGINAL_REQUEST.md`: 53 lines defining R1 (write regression repair), R2 (UX/UI redesign), R3 (integrity & security constraints), and explicit automated verification expectations (`npm run build`, `npm run lint`, `npm test`).
2. **Current Codebase Structure & Data Flow Observed:**
   - `lib/saveMatch.ts` (lines 21-78): `saveMatchResult` computes scores via `lineup.reduce((sum, row) => sum + (row.played ? row.points ?? 0 : 0), 0)`. Updates `matches` status to mapped status (`statusMap[resultType]`), `home_score`, `away_score`, and `played_date = new Date().toISOString()`. Deletes previous rows in `player_match_stats` for `match_id` and re-inserts only attended players (`row.played === true`).
   - `lib/saveMatch.ts` (lines 80-141): Automates Liguilla best-of-3 series completion (`No Necesario` when a team reaches 2 wins; reverts to `Programado` if scores change).
   - `lib/validators.ts` (lines 8-36): `checkPrerequisites` verifies an active season exists (`is_active = true`) and at least 2 active teams exist in that season for `calendar`, `capture`, and `playoff`.
   - `lib/access-control.ts` (lines 1-268): Enforces 4 admin roles: `super_admin`, `registro_equipos`, `programacion`, `captura_resultados`, with paths mapping to required permissions (`manage_seasons`, `manage_teams`, `manage_calendar`, `manage_capture`, `view_eligibility`, `manage_access`).
   - `lib/eligibility.ts` (lines 11-62): Calculates playoff eligibility: `minRequerido = Math.floor(totalPartidos / 2) + 1`. Players with fewer attendances than `minRequerido` are filtered out of capture during non-regular phases.
   - `app/components/AdminLayout.tsx` (lines 141-143): Line 141 specifies `<Content style={{ padding: '20px 16px', maxWidth: 960, margin: '0 auto', width: '100%' }}>`. This fixed width constraint creates vast unused lateral empty space on 1366×768 and 1920×1080 screens.
   - `app/components/AdminLayout.tsx` (lines 106-139): Mobile navigation currently uses a simple horizontal overflowing bar (`display: 'flex', overflowX: 'auto'`) rather than an accessible Drawer.
   - `app/admin/teams/page.tsx` (lines 1036-1271): Lacks instant search input (`Buscar equipo...`), lacks alphabetical A-Z sorting buttons/filter, lacks "Limpiar filtros", and lacks the `X de Y equipos` counter feedback required by R2.
   - `app/admin/calendar/page.tsx` (lines 1109-1172): Contains numerous filters (vuelta, court, status, jornada, team), but lacks a "Limpiar filtros" button and lacks the `X de Y partidos` counter. Button toolbar treats all secondary buttons with similar visual weight.
   - `app/admin/capture/page.tsx` & `CaptureForm.tsx`: Match selector uses a standard select dropdown without grouping pending vs completed matches. Match header lacks sticky position during long table scrolling.
3. **Automated Verification Observed:**
   - Running `npm test` executed Vitest across 20 test files, passing all 73 tests in 1.52s.
   - Running `npm run lint` executed ESLint with exit code 0 and zero lint errors.

---

## 2. Logic Chain

1. **Connecting R1 to Technical Implementation:**
   - The user request and megaprompt mandate that any write/capture failure must be reproduced and repaired across the full chain: `UI -> Form/State -> Handlers -> Supabase Client -> DB -> Response -> Refresh`.
   - Inspection of `lib/saveMatch.ts` and `CaptureForm.tsx` shows that `saveMatchResult` requires both a valid `matchId`, valid lineups where points are numbers, and client-side database permissions.
   - Any regression preventing save could stem from unhandled validation rejections, missing season prerequisites (`checkPrerequisites`), or state mismatch in TanStack Query invalidation.
   - Hence, our specification inventory explicitly documents each database write contract, error codes (e.g. FK error `23503` requiring soft-delete), and exact state flows.
2. **Connecting R2 to UI/UX Architecture:**
   - Observations of `AdminLayout.tsx` revealed `maxWidth: 960`, explaining user feedback regarding excessive empty space on laptops (`1366×768`). Eliminating this constraint and adopting fluid, compact dark layouts directly addresses the problem.
   - Observations of `teams/page.tsx` and `calendar/page.tsx` confirmed the total absence of A-Z sorting controls, instant search, "Limpiar filtros" buttons, and `X de Y` counters.
   - Incorporating these requirements into `spec_inventory.md` provides unambiguous implementation targets for the upcoming redesign subagents.
3. **Connecting R3 to Safety Constraints:**
   - The requirement for zero data loss is critical in a live basketball league system with historical matches, points, and player credentials.
   - Soft-delete logic (`is_active = false`) for players with existing `player_match_stats` avoids foreign key constraint violations while preserving historical league integrity.

---

## 3. Caveats

- **Active Regression Investigation:** The specific live bug causing write failure on `/admin/capture` was not actively debugged in execution by this agent, as this agent is purely a read-only Specification Miner. The concrete reproduction and code fix will be handled by the Regression Investigator and Lead Integrator.
- **Visual Design Implementation:** Actual CSS styling, color palette tuning, and Ant Design theme modifications are specified in `spec_inventory.md` but are to be implemented by subsequent frontend subagents.
- **No other caveats.**

---

## 4. Conclusion

All functional, data flow, UX/UI, accessibility, responsive, and verification requirements from `MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md` and `.agents/ORIGINAL_REQUEST.md` have been exhaustively extracted, structured, and cross-verified against project source code and tests.

The complete specification inventory has been authored and validated in:
`d:\liga-nochixtlan-js\.agents\spec_miner_survey_1\spec_inventory.md`

It contains:
- Executive Summary & Core Rules
- Functional Requirements (R1, R2, R3)
- Data Flow & Business Rules (Points 3-1-0, Tie-breakers, Eligibility, Credentials)
- Module-by-Module UI/UX Specifications (App Shell, Dashboard, Teams/Players, Calendar, Capture V2, Seasons, Access)
- Features Discovered Table (20 comprehensive items)
- Edge Cases Table (18 concrete scenarios)
- Acceptance Criteria & Automated Verification Plan

---

## 5. Verification Method

1. **Inspect Artifacts:**
   - View `d:\liga-nochixtlan-js\.agents\spec_miner_survey_1\spec_inventory.md` to confirm all 7 sections, tables, and rules are intact.
   - View `d:\liga-nochixtlan-js\.agents\spec_miner_survey_1\BRIEFING.md` and `progress.md`.
2. **Execute Project Verification Commands:**
   - Run `npm test` to verify Vitest suite integrity (expected: 20 test files passed, 73 tests passed).
   - Run `npm run lint` to verify clean ESLint status (expected: code 0).
3. **Invalidation Conditions:**
   - The findings would be invalidated if the database schema or business rules for standings points (3-1-0), playoff eligibility, or match statuses are altered.
