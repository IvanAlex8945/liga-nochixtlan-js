# Task Dispatch — E2E Testing Track: Test Infrastructure & Suite Design

Working directory: d:\liga-nochixtlan-js\.agents\teamwork_preview_test_writer_e2e_1
Original Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Reference Spec: d:\liga-nochixtlan-js\MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md
Project Scope: d:\liga-nochixtlan-js\PROJECT.md

## Mission
Design the E2E test infrastructure and author comprehensive requirement-driven test cases (Tiers 1-4) for the Admin Panel:
1. Create `TEST_INFRA.md` at project root `d:\liga-nochixtlan-js\TEST_INFRA.md` following the template in Project Pattern:
   - Test philosophy (opaque-box, requirement-driven, derives from ORIGINAL_REQUEST and MEGAPROMPT).
   - Feature inventory mapping to test tiers.
   - Test runner and directory layout (`tests/e2e/`).
2. Author automated tests covering:
   - Tier 1: Feature Coverage (≥5 tests per feature: capture flow, save persistence across reload/season switch, A-Z sort, instant search, filters reset, counter, double-submit prevention, Topbar active season).
   - Tier 2: Boundary & Corner Cases (empty search results, single player rosters, tie score handling, negative points rejection, zero attendance).
   - Tier 3: Cross-Feature Combinations (search + category filter + A-Z sort; capture result + calendar status change + standings recomputation).
   - Tier 4: Real-World Application Scenarios (full jornada capture session, multi-team registration with player credentials).
3. Ensure test suite can be run via an npm command or test runner script (e.g. `npx vitest run tests/e2e` or similar).
4. When test suite is ready and passing, publish `TEST_READY.md` at project root.
5. Deliver handoff.md in your working directory.

## 2026-09-03T20:19:43Z
You are the E2E Test Suite Writer for Project Liga Nochixtlán.
Working directory: d:\liga-nochixtlan-js\.agents\teamwork_preview_test_writer_e2e_1
Original Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Reference Spec: d:\liga-nochixtlan-js\MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md
Project Scope: d:\liga-nochixtlan-js\PROJECT.md
DISPATCH: d:\liga-nochixtlan-js\.agents\teamwork_preview_test_writer_e2e_1\DISPATCH.md

Your mission:
1. Create d:\liga-nochixtlan-js\TEST_INFRA.md following the Project Pattern template.
2. Design and implement a comprehensive opaque-box test suite across Tiers 1-4 in tests/e2e/ using Vitest.
   - Tier 1: Feature coverage (save persistence, reload season retention, search, A-Z sort, filter reset, counter, double-submit protection, Topbar active season).
   - Tier 2: Boundary & Corner cases (empty results, negative score rejection, etc.).
   - Tier 3: Cross-feature combinations.
   - Tier 4: Real-world scenarios.
3. Run and verify all tests pass.
4. When tests pass, create d:\liga-nochixtlan-js\TEST_READY.md.
5. Deliver handoff.md in your working directory and message orchestrator when done.
