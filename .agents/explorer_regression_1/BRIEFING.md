# BRIEFING — 2026-09-03T20:18:00Z

## Mission
Investigate technical cause of write/capture regression (R1) in Admin panel (/admin/capture, /admin/teams, /admin/calendar, /admin/seasons) and audit end-to-end data flow.

## 🔒 My Identity
- Archetype: explorer
- Roles: Data Flow & Regression Explorer
- Working directory: d:\liga-nochixtlan-js\.agents\explorer_regression_1
- Original parent: c408cb50-b8af-4c7b-a8ad-f5a4c4e36c02
- Milestone: Investigation & Root Cause Diagnosis

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Preserve schema, zero data loss
- Base all conclusions on verified evidence (files, line numbers, commands)
- Keep BRIEFING.md under ~100 lines

## Current Parent
- Conversation ID: c408cb50-b8af-4c7b-a8ad-f5a4c4e36c02
- Updated: 2026-09-03T20:18:00Z

## Investigation State
- **Explored paths**: `/admin/capture`, `/admin/teams`, `/admin/calendar`, `/admin/seasons`, `lib/supabase*`, `lib/saveMatch.ts`, `lib/eligibility.ts`, `lib/access-control*`, database schema & constraints.
- **Key findings**:
  1. Reload season reset: 5 concurrent active seasons exist, but `.limit(1).single()` hardcodes reset to season 3 (Femenil) on mount/reload.
  2. Missing React Query cache invalidation for `['matches-programmed', seasonId]` in `/admin/capture`.
  3. Client desynchronization: Auth login stores in cookies (`@supabase/ssr`), while frontend admin mutations use anon client (`lib/supabase.ts`).
  4. Constraint `matches_vuelta_check` requires explicit `vuelta` on match inserts.
- **Unexplored areas**: None in scope; investigation complete.

## Key Decisions Made
- Fully documented root causes and fix strategies in `regression_analysis.md` and `handoff.md`.

## Artifact Index
- d:\liga-nochixtlan-js\.agents\explorer_regression_1\DISPATCH.md — Task assignment
- d:\liga-nochixtlan-js\.agents\explorer_regression_1\progress.md — Liveness & progress tracking
- d:\liga-nochixtlan-js\.agents\explorer_regression_1\regression_analysis.md — Comprehensive technical report
- d:\liga-nochixtlan-js\.agents\explorer_regression_1\handoff.md — Self-contained handoff report
