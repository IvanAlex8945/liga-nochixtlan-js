# Test Infrastructure Specification — Project Liga Nochixtlán

**Document Version:** 1.0.0  
**Target Module:** Admin Panel (`/admin/*`)  
**Specification Sources:** `ORIGINAL_REQUEST.md`, `MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md`, `PROJECT.md`  
**Author:** E2E Test Suite Writer (`teamwork_preview_test_writer_e2e_1`)  
**Status:** ACTIVE  

---

## 1. Executive Summary & Testing Philosophy

This document defines the End-to-End (E2E) testing infrastructure, methodology, and verification strategy for the Liga Nochixtlán Admin Panel. The overarching objective is to guarantee the complete repair of write and capture regressions (R1), validate the usability, search, sorting, and navigation enhancements (R2), and enforce strict data and security constraints (R3).

### Core Testing Principles

1. **Opaque-Box Testing:**
   Tests interact strictly with system contracts, domain models, state stores, and user workflows from an external boundary perspective. Tests never assert on private internal implementation details, ensuring freedom to refactor UI layout and components without brittle test failures.

2. **Requirement-Driven Derivation:**
   Every test case traces directly to an explicit requirement in `ORIGINAL_REQUEST.md`, `MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md`, or `PROJECT.md`. Expected outputs are derived mathematically from official basketball league business rules (e.g. 3-1-0 standings rule in `lib/liga.ts`, eligibility formula $\lfloor N/2 \rfloor + 1$ in `lib/eligibility.ts`, 20-0 W.O. margin, and `matches_vuelta_check` database constraints).

3. **Isolated & Deterministic Execution:**
   Each test initializes its own clean state and cleans up after itself. Tests execute independently of suite execution order and external network availability. Database mutations and server state transitions are evaluated using high-fidelity in-memory state simulators mirroring PostgreSQL and Supabase behavior.

4. **Progressive Testability & Zero Regressions:**
   Tests cover the full operational lifecycle of the admin application: from baseline feature functionality (Tier 1), through extreme inputs and boundary conditions (Tier 2), across composite feature interactions (Tier 3), to multi-step real-world tournament workflows (Tier 4).

---

## 2. Directory Layout & Architecture

The E2E test suite resides entirely in `tests/e2e/`, structured into distinct tiers and modular fixture helpers:

```text
tests/
├── access-control.test.ts          # Existing unit tests
├── eligibility.test.ts             # Existing unit tests
├── liga.test.ts                    # Existing unit tests
├── player-number.test.ts           # Existing unit tests
├── public-cache-keys.test.ts       # Existing unit tests
├── public-team-matches.test.ts     # Existing unit tests
├── scheduling.test.ts              # Existing unit tests
├── standings.test.ts               # Existing unit tests
└── e2e/                            # E2E Test Infrastructure
    ├── helpers/
    │   └── test-fixtures.ts        # In-memory Supabase simulator, AdminStore simulator, fixtures
    ├── tier1-features.test.ts      # Tier 1: 9 Features, >=5 tests per feature (>=45 tests)
    ├── tier2-boundaries.test.ts    # Tier 2: Boundary conditions, corner cases & constraints
    ├── tier3-combinations.test.ts  # Tier 3: Cross-feature integrations & state sync
    └── tier4-scenarios.test.ts     # Tier 4: Real-world tournament workflows & sessions
```

### Execution Commands

- **Run Full Suite (Unit + E2E):**
  ```powershell
  npm test
  ```
- **Run E2E Suite Exclusively:**
  ```powershell
  npx vitest run tests/e2e
  ```
- **Run Specific Tier:**
  ```powershell
  npx vitest run tests/e2e/tier1-features.test.ts
  npx vitest run tests/e2e/tier2-boundaries.test.ts
  npx vitest run tests/e2e/tier3-combinations.test.ts
  npx vitest run tests/e2e/tier4-scenarios.test.ts
  ```

---

## 3. Feature Inventory & Mapping to Test Tiers

The test matrix maps requirements and features to test tiers to guarantee 100% verification coverage:

| Feature # | Feature Name | Target Tier | Min. Tests | Primary Contract / File | Spec Origin |
|---|---|---|---|---|---|
| F01 | Save Persistence | Tier 1 | 5 | `lib/saveMatch.ts` | R1, MEGAPROMPT §6, §31, §47 |
| F02 | Reload Season Retention | Tier 1 | 5 | `lib/admin-store.ts` | R1, PROJECT.md F1, MEGAPROMPT §9 |
| F03 | Instant Search | Tier 1 | 5 | `app/admin/teams`, `AdminFilterBar` | R2, PROJECT.md F10, MEGAPROMPT §17 |
| F04 | A–Z Sort | Tier 1 | 5 | `app/admin/teams` | R2, PROJECT.md F10, MEGAPROMPT §13 |
| F05 | Filter Reset | Tier 1 | 5 | `AdminFilterBar` | R2, PROJECT.md F11, MEGAPROMPT §18 |
| F06 | Results Counter | Tier 1 | 5 | `AdminFilterBar` (`X de Y`) | R2, PROJECT.md F11, MEGAPROMPT §18 |
| F07 | Double-Submit Protection | Tier 1 | 5 | `app/components/CaptureForm.tsx` | R2, PROJECT.md F17, MEGAPROMPT §31 |
| F08 | Topbar Active Season | Tier 1 | 5 | `app/components/AdminLayout.tsx` | R2, PROJECT.md F7, MEGAPROMPT §9 |
| F09 | Capture Workflow V2 | Tier 1 | 5 | `app/admin/capture/page.tsx` | R2, PROJECT.md F14-F16, MEGAPROMPT §22-§28 |
| B01 | Empty Search & Filter State | Tier 2 | 2 | `AdminFilterBar` | MEGAPROMPT §38 |
| B02 | Single Player Roster | Tier 2 | 2 | `CaptureForm`, `PlayerAttendanceTable` | Edge cases |
| B03 | Tie Score Handling | Tier 2 | 2 | `saveMatch.ts`, basketball rules | Domain rules |
| B04 | Negative Points / Triples | Tier 2 | 2 | `saveMatch.ts`, input validators | R2.5, Data integrity |
| B05 | 3PT > Total Points Rejection | Tier 2 | 2 | Capture validation | Domain logic |
| B06 | Zero Attendance Handling | Tier 2 | 2 | `saveMatch.ts`, `eligibility.ts` | Edge cases |
| B07 | Extreme / High Score (150+) | Tier 2 | 2 | `saveMatch.ts`, standings | Boundary stress |
| B08 | Accents & Special Characters | Tier 2 | 2 | Search engine, normalization | MEGAPROMPT §17 |
| B09 | DB Constraint `matches_vuelta_check` | Tier 2 | 2 | `matches` table contract | PROJECT.md F4, Postgres 23514 |
| B10 | Soft-Delete Roster Integrity | Tier 2 | 2 | `players` table, `is_active` | PROJECT.md F5 |
| C01 | Search + Category Filter + A-Z Sort + Counter | Tier 3 | 2 | Combined filter pipeline | PROJECT.md F10, F11 |
| C02 | Capture Result + Status + Standings Update | Tier 3 | 2 | `saveMatch.ts` + `standings.ts` | R1, PROJECT.md F2 |
| C03 | W.O. Result + Auto 20-0 + Standings 3-1-0 | Tier 3 | 2 | `saveMatch.ts` + `liga.ts` | R1, Rules 3-1-0 |
| C04 | Global Season Switch + Multi-Module Sync | Tier 3 | 2 | `admin-store.ts` + Views | PROJECT.md F1 |
| C05 | Filter Edit + Reset + Counter Restoration | Tier 3 | 2 | Filter lifecycle | MEGAPROMPT §18 |
| S01 | Full Jornada Capture Session | Tier 4 | 2 | End-to-end round completion | MEGAPROMPT §22, §47 |
| S02 | Multi-Team Registration & Eligibility Check | Tier 4 | 2 | Team & Player enrollment + Playoff | MEGAPROMPT §34, `eligibility.ts` |
| S03 | Liguilla Best-of-3 Series Automation | Tier 4 | 2 | `saveMatch.ts` series resolution | `saveMatch.ts:80-140` |
| S04 | Role-Based Admin Operations Matrix | Tier 4 | 2 | `access-control.ts` RBAC enforcement | `access-control.ts` |

---

## 4. Test Tier Specifications

### Tier 1: Feature Coverage (≥5 Tests Per Feature)

1. **Save Persistence (`save_persistence`):**
   - Assert match status transitions from `'Programado'` to `'Jugado'` upon save.
   - Assert aggregate score matches sum of player individual points.
   - Assert player attendance and points persist in `player_match_stats`.
   - Assert non-attending players do not generate stat rows (or have `played: false`).
   - Assert subsequent re-fetch of saved match reflects persisted values without cache stale decay.

2. **Reload Season Retention (`reload_season_retention`):**
   - Assert `selectedSeasonId` persists to `localStorage` under `selected_admin_season_id`.
   - Assert reloading page with multiple active seasons (e.g. 5 concurrent active seasons) preserves user-chosen season instead of defaulting to Season 3.
   - Assert initializing with no prior stored season picks first active season cleanly.
   - Assert updating season via selector notifies subscribers and updates storage.
   - Assert URL sync (`?season=<id>`) initializes store with highest precedence when provided.

3. **Instant Search (`instant_search`):**
   - Assert case-insensitive filtering (`"halcones"`, `"HALCONES"`, `"Halcones"`).
   - Assert accent-insensitive filtering (`"Atlético"` matches `"atletico"`).
   - Assert prefix matching (`"Mue"` matches `"Muebles Carlitos"`).
   - Assert middle substring matching (`"Carl"` matches `"Muebles Carlitos"`).
   - Assert search operates with zero lag on large team rosters without server round-trip.

4. **A–Z Sort (`az_sort`):**
   - Assert team list is sorted A–Z alphabetically by default on initial render.
   - Assert accented names sort naturally without UTF-8 codepoint misplacement (e.g. "Águilas" alongside "A").
   - Assert numbers and mixed alphanumeric names sort coherently (e.g. "12 de Octubre").
   - Assert toggle to Z–A correctly inverts sort order.
   - Assert empty string or missing names are handled gracefully at the end of the collection.

5. **Filter Reset (`filter_reset`):**
   - Assert applying category filter (`"3ra"`) filters the list.
   - Assert applying search query (`"Muebles"`) narrows results.
   - Assert clicking "Limpiar filtros" clears search input to `""`.
   - Assert clicking "Limpiar filtros" resets category dropdown to `"all"`.
   - Assert all original items are restored to view after reset.

6. **Results Counter (`counter`):**
   - Assert counter displays total format `X de Y equipos` (e.g., `"17 de 17 equipos"` initially).
   - Assert counter updates to matching count on search (e.g., `"1 de 17 equipos"`).
   - Assert counter displays `"0 de 17 equipos"` when search yields no matches.
   - Assert counter reflects combined category + search filters.
   - Assert counter restores to total count when filters are cleared.

7. **Double-Submit Protection (`double_submit_protection`):**
   - Assert save action toggles `isSubmitting` / `saving` flag to `true`.
   - Assert submit button is disabled (`disabled = true`) while operation is in-flight.
   - Assert rapid consecutive submit clicks do NOT trigger duplicate Supabase RPC / insert calls.
   - Assert `saving` state resets to `false` upon promise completion.
   - Assert `saving` state resets to `false` upon promise rejection (error path).

8. **Topbar Active Season (`topbar_active_season`):**
   - Assert Topbar displays current active season name and category badge.
   - Assert switching season in store immediately updates Topbar display.
   - Assert Topbar remains visible across all admin routes (`/admin`, `/admin/teams`, `/admin/calendar`, `/admin/capture`).
   - Assert Topbar exposes breadcrumbs contextual to active section.
   - Assert Topbar renders user badge and logout trigger consistently.

9. **Capture Workflow V2 (`capture_flow`):**
   - Assert match selector prioritizes `'Programado'` / pending matches before completed matches.
   - Assert selecting match populates home and away team rosters.
   - Assert playoff matches filter rosters by eligibility threshold $\lfloor N/2 \rfloor + 1$.
   - Assert score auto-sums from player inputs in real time.
   - Assert successful save provides unequivocal feedback and options to navigate to next pending match.

---

### Tier 2: Boundary & Corner Cases

- **B01:** Search query producing 0 results displays helpful empty state and "Limpiar filtros" action.
- **B02:** Team with a single player roster saves match without array indexing or reduce exceptions.
- **B03:** Tie score handling: basketball regulations require a decisive winner; validate rejection or overtime flag.
- **B04:** Negative points and negative 3PT inputs are strictly rejected with user-friendly validation feedback.
- **B05:** 3PT shots yielding more points than total scored points ($3 \times \text{triples} > \text{points}$) is flagged as a validation error.
- **B06:** Zero attendance match (e.g. forfeited prior to tip-off) transitions correctly without corrupting stats.
- **B07:** Extreme score match (e.g. 150 points) computes standings, differential, and player stats correctly without numeric overflow.
- **B08:** Special characters (`#`, `&`, `/`, `"`, `'`) in team names or search strings do not break filtering or throw regex syntax errors.
- **B09:** Match insertion without required `vuelta` column triggers constraint violation matching PostgreSQL error 23514 (`matches_vuelta_check`).
- **B10:** Deactivated/soft-deleted players (`is_active: false`) retain past stats in `player_match_stats` without foreign key cascading deletion (error 23503).

---

### Tier 3: Cross-Feature Combinations

- **C01:** Search + Category Filter + A-Z Sort + Dynamic Counter operates in a unified pipeline without intermediate state corruption.
- **C02:** Capture Result triggers match status transition (`'Programado'` $\to$ `'Jugado'`), generates player stats, and triggers standings table recomputation.
- **C03:** W.O. match result sets 20-0 default score, awards 3 points to victor, 0 points to forfeiting team, and updates standings differential appropriately.
- **C04:** Global season change in Admin Store updates both Teams view and Calendar view filters simultaneously.
- **C05:** Deep filter modification followed by single-click "Limpiar filtros" completely restores pristine state and counter.

---

### Tier 4: Real-World Scenarios

- **S01: Full Jornada Capture Session:**
  Simulate capturing an entire weekend round (Jornada 12: 5 matches).
  Validate queue of pending matches shrinking as each is captured, standings updating cumulatively after each match, and public cache invalidation dispatching with the correct season ID.

- **S02: Multi-Team Registration & Playoff Eligibility Verification:**
  Simulate enrolling 4 teams with 10 players each. Run regular season matches. Execute eligibility calculation for playoffs, asserting players with $\ge \lfloor N/2 \rfloor + 1$ attendances are flagged eligible, and those below are flagged ineligible.

- **S03: Liguilla Best-of-3 Series Automation:**
  Execute a playoff series between Team A and Team B.
  Game 1: Team A wins. Series status remains active; Game 3 remains `'Programado'`.
  Game 2: Team A wins again (2-0). System automatically sets Game 3 status to `'No Necesario'`.

- **S04: Role-Based Admin Operations Matrix:**
  Test RBAC boundaries across four admin roles: `super_admin`, `registro_equipos`, `programacion`, `captura_resultados`. Verify route access permissions, module visibility, and write barriers.

---

## 5. Verification Gates & Acceptance Protocol

The test suite is considered ready and valid when:
1. All unit tests (`tests/*.test.ts`) continue to pass 100%.
2. All E2E tests (`tests/e2e/*.test.ts`) execute cleanly and pass 100%.
3. `npm run build` compiles with code 0 (Next.js App Router Turbopack).
4. `npm run lint` completes with zero errors.
5. `TEST_READY.md` is published at the project root summarizing test inventory, execution instructions, and passing results.
