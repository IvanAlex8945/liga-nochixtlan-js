# BRIEFING — 2026-09-03T20:23:45Z

## Mission
Analyze Milestone 1 Items 3, 4 & 5 (Cache Invalidation, DB Constraints matches_vuelta_check, Soft-delete on FK error 23503 + Liguilla roster eligibility) and formulate a concrete implementation plan for Worker.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Read-only investigation, code & schema analysis, implementation planning
- Working directory: d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_3
- Original parent: c408cb50-b8af-4c7b-a8ad-f5a4c4e36c02
- Milestone: M1 Items 3, 4, 5

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Investigate TanStack Query cache invalidation in CaptureForm.tsx and app/admin/capture/page.tsx
- Investigate PostgreSQL check constraint matches_vuelta_check: identify everywhere matches are inserted and ensure vuelta is supplied
- Investigate soft-delete handling on FK error 23503 when deleting players or teams with historical stats, and Liguilla roster eligibility display
- Write to own directory only (.agents\teamwork_preview_explorer_m1_3)
- Deliver handoff.md and notify orchestrator

## Current Parent
- Conversation ID: c408cb50-b8af-4c7b-a8ad-f5a4c4e36c02
- Updated: 2026-09-03T20:23:45Z

## Investigation State
- **Explored paths**:
  - `app/admin/capture/page.tsx`
  - `app/components/CaptureForm.tsx`
  - `app/components/PlayerAttendanceTable.tsx`
  - `app/components/AntdProvider.tsx`
  - `app/admin/calendar/page.tsx`
  - `app/admin/calendar/MissingMatchesModal.tsx`
  - `app/admin/calendar/LiguillaModal.tsx`
  - `app/admin/teams/page.tsx`
  - `app/admin/eligibility/page.tsx`
  - `lib/saveMatch.ts`
  - `lib/eligibility.ts`
  - `scripts/simulateLiguilla.mjs`
  - `migration_match_vuelta_phase2.sql`
  - `tests/e2e/tier1-features.test.ts`
  - `tests/e2e/tier2-boundaries.test.ts`
- **Key findings**:
  - Item 1: `useQueryClient` is completely missing from `CaptureForm.tsx` and `app/admin/capture/page.tsx`. `saveMatchResult` updates Supabase and ISR revalidation, but does not invalidate TanStack Query cache (`staleTime: 30s`), causing stale match status, lineups, and scores. Save button lacks `disabled={saving}` / `loading={saving}`.
  - Item 2: `matches_vuelta_check` is enforced by PostgreSQL (23514). Identified all 7 match insertion locations. Found bug in `MissingMatchesModal.tsx:225` where missing single games are hardcoded to `key: -mirror` assuming `vuelta`, breaking if the existing match was `vuelta`. `simulateLiguilla.mjs` completely omits `vuelta`.
  - Item 3: `deletePlayer` already catches FK 23503 and marks `is_active: false`. However, `deleteTeam` dangerously hard-deletes matches and player_match_stats before deleting teams, violating Rule R3. In `/admin/capture`, lines 130 and 184 hard-filter ineligible players in Liguilla (`playersData.filter(p => eligibleSet.has(p.id))`), hiding them instead of displaying them with the existing `is_eligible` indicator and allowing override.
- **Unexplored areas**: None. All items thoroughly audited down to exact line numbers and code changes.

## Key Decisions Made
- Mapped all cache keys to be invalidated: `['matches-programmed']`, `['matches-programmed', seasonId]`, `['matches', seasonId]`, `['stats', seasonId]`, `['standings', seasonId]`, `['season-detail', seasonId]`, `['players-capture-home']`, `['players-capture-away']`, `['eligibility']`.
- Designed non-destructive soft-delete pattern for `deleteTeam` via `{ status: 'Baja' }` and cascading player deactivation `{ is_active: false }`.
- Designed Liguilla roster display improvement retaining all active players and displaying `Elegible (X/Y)` / `No elegible (X/Y)` tags.

## Artifact Index
- d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_3\DISPATCH.md — Dispatch log
- d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_3\BRIEFING.md — Situational awareness
- d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_3\progress.md — Heartbeat & progress log
- d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_3\handoff.md — Final handoff report
