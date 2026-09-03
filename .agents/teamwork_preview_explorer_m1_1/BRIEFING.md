# BRIEFING — 2026-09-03T20:25:00Z

## Mission
Analyze Milestone 1 Item 1: Centralizing active season state in lib/admin-store.ts using Zustand with persist middleware, tracing admin page usage, defining store contracts, hydration safety, and worker implementation plan.

## 🔒 My Identity
- Archetype: explorer
- Roles: read-only investigation, architectural analysis, synthesis
- Working directory: d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_1
- Original parent: c408cb50-b8af-4c7b-a8ad-f5a4c4e36c02
- Milestone: Milestone 1 - Item 1 (Zustand Admin Store Architecture)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in source code
- Write only to working directory (.agents/teamwork_preview_explorer_m1_1/)
- Adhere to Next.js App Router SSR / Hydration rules
- Deliver complete handoff.md with 5 components and message orchestrator

## Current Parent
- Conversation ID: c408cb50-b8af-4c7b-a8ad-f5a4c4e36c02
- Updated: 2026-09-03T20:25:00Z

## Investigation State
- **Explored paths**:
  - `package.json` (zustand ^5.0.12, next 16.2.9, react 19.2.7)
  - `node_modules/zustand/esm/` (middleware.mjs, react.mjs, useSyncExternalStore hydration mechanism)
  - `app/admin/capture/page.tsx` (traced useState and limit(1).single at line 85)
  - `app/admin/calendar/page.tsx` (traced useState and limit(1).single at line 168)
  - `app/admin/teams/page.tsx` (traced useState and limit(1).single at line 430)
  - `app/admin/seasons/page.tsx` (traced activation/deactivation mutations and query invalidation)
  - `app/admin/eligibility/page.tsx` (traced useState and limit(1).single at line 22)
  - `app/admin/page.tsx` (traced useState and limit(1).single at line 42)
  - `app/components/SeasonSelector.tsx` (analyzed controlled vs store-driven patterns)
  - `app/components/AdminLayout.tsx` (analyzed shell and topbar integration)
  - `tests/e2e/tier1-features.test.ts` & `tests/e2e/helpers/test-fixtures.ts` (analyzed store simulator contract)
- **Key findings**:
  - Zustand v5 is already installed in package.json (^5.0.12).
  - Zustand v5's `useStore` natively leverages `React.useSyncExternalStore` with `getInitialState()`, providing clean SSR hydration.
  - To be 100% crash-proof in App Router and private browsing, a `safePersistStorage` wrapper checking `typeof window === 'undefined'` and handling both raw string `"4"` and JSON `{"state":{"selectedSeasonId":4}}` must be provided.
  - 5 admin pages currently maintain disconnected `useState` and reset to Season 3 on reload via `supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()`.
  - Fallback logic: Precedence 1 is URL param (`?season=X`), Precedence 2 is persisted active choice in localStorage (`selected_admin_season_id`), Precedence 3 is first active season from DB.
- **Unexplored areas**: None. Architectural design and migration map are complete.

## Key Decisions Made
- Designed complete `lib/admin-store.ts` specification with `useAdminStore`, `safePersistStorage`, `STORAGE_KEY = 'selected_admin_season_id'`, and `initializeSeason`.
- Designed dual-mode `SeasonSelector.tsx` (backwards-compatible with controlled props, yet automatically store-driven when props are omitted).
- Mapped all 5 admin pages for direct worker implementation.
- Formulated test specification for `tests/admin-store.test.ts`.

## Artifact Index
- DISPATCH.md — Task assignment and instructions
- BRIEFING.md — Persistent working memory
- progress.md — Activity log and heartbeat
- handoff.md — Final 5-component handoff report
