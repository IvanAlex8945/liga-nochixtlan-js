# Task Dispatch — M1 Reviewer 1: State Store & Supabase Client

Working directory: d:\liga-nochixtlan-js\.agents\teamwork_preview_reviewer_m1_1
Project Scope: d:\liga-nochixtlan-js\PROJECT.md
Original Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Worker Handoff: d:\liga-nochixtlan-js\.agents\worker_m1_1\handoff.md
Test Suite Certification: d:\liga-nochixtlan-js\TEST_READY.md

## Mission
Independently review the work implemented by `worker_m1_1` for Milestone 1:
1. Review `lib/admin-store.ts`, `lib/supabase.ts`, `lib/supabase/client.ts`, and `app/components/SeasonSelector.tsx`.
2. Verify that reload season retention works as intended (persisting to localStorage with key `selected_admin_season_id`), avoiding deterministic reset to Season 3.
3. Verify that all 5 admin pages correctly use `useAdminStore` without React 19 hydration or hook violations.
4. Execute verification commands:
   - `npm test`
   - `npx vitest run tests/e2e`
   - `npm run build`
   - `npm run lint`
5. Render a clear verdict: **APPROVE** or **REQUEST_CHANGES** with precise technical evidence.
6. Deliver handoff.md in your working directory and notify the orchestrator.

## 2026-09-03T20:34:04Z
You are M1 Reviewer 1: State Store & Supabase Client.
Working directory: d:\liga-nochixtlan-js\.agents\teamwork_preview_reviewer_m1_1
Project Scope: d:\liga-nochixtlan-js\PROJECT.md
Original Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Worker Handoff: d:\liga-nochixtlan-js\.agents\worker_m1_1\handoff.md
Test Suite Certification: d:\liga-nochixtlan-js\TEST_READY.md
DISPATCH: d:\liga-nochixtlan-js\.agents\teamwork_preview_reviewer_m1_1\DISPATCH.md

Review the implementation by worker_m1_1:
1. Examine lib/admin-store.ts, lib/supabase.ts, lib/supabase/client.ts, SeasonSelector.tsx, and admin pages.
2. Verify reload season retention and SSR hydration safety.
3. Run npm test, npx vitest run tests/e2e, npm run build, npm run lint.
4. Render APPROVE or REQUEST_CHANGES in handoff.md with evidence and message orchestrator when done.
