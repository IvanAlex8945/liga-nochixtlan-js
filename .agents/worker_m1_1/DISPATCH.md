# Task Dispatch — Milestone 1 Worker: Persistence & Data Layer Repair

Working directory: d:\liga-nochixtlan-js\.agents\worker_m1_1
Project Root: d:\liga-nochixtlan-js
Original User Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Reference Specification: d:\liga-nochixtlan-js\MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md
Project Scope: d:\liga-nochixtlan-js\PROJECT.md

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Architecture & Explorer Handoffs to Read:
1. `d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_1\handoff.md` (Zustand Store specification and page migration plan)
2. `d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_2\handoff.md` (Supabase browser client unification specification)
3. `d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_3\handoff.md` (TanStack Query cache invalidation, DB constraints, and soft-delete specification)

## Exclusive File Ownership
- `lib/admin-store.ts` (create)
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
- `tests/admin-store.test.ts` (create)

## Implementation Tasks
1. Create `lib/admin-store.ts` using `zustand` and `persist` middleware with `safePersistStorage` and 3-tier fallback logic.
2. Update `lib/supabase.ts` and `lib/supabase/client.ts` so browser uses `createBrowserClient` from `@supabase/ssr` with shared cookie session, while preserving server compatibility.
3. Update `SeasonSelector.tsx` to integrate with `useAdminStore` with backward compatibility.
4. Replace `.limit(1).single()` on-mount season resets in `/admin/capture`, `/admin/calendar`, `/admin/teams`, `/admin/eligibility`, and `/admin/page.tsx` with `useAdminStore()`.
5. In `CaptureForm.tsx`, import `useQueryClient` and invalidate queries on save (`['matches-programmed', seasonId]`, `['matches-recent', seasonId]`, `['standings', seasonId]`, `['match', matchId]`), and add `disabled={saving}` + `loading={saving}` to the save button.
6. Fix `MissingMatchesModal.tsx` so match insertions satisfy `matches_vuelta_check`.
7. Ensure soft-delete handling for FK error 23503 and ensure Liguilla rosters do not hard-block capture.
8. Add unit tests in `tests/admin-store.test.ts`.
9. Run verification commands: `npm test`, `npm run lint`, `npm run build`. All must pass with exit code 0.
10. Deliver a self-contained `handoff.md` in your working directory and notify the orchestrator.

## 2026-09-03T20:24:24Z
Received worker dispatch for Milestone 1: Persistence & Data Layer Repair.
