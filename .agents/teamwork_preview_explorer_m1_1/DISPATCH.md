# Task Dispatch — M1 Explorer 1: Zustand Admin Store Architecture

Working directory: d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_1
Original Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Project Scope: d:\liga-nochixtlan-js\PROJECT.md
Prior Analysis: d:\liga-nochixtlan-js\.agents\explorer_regression_1\regression_analysis.md

## Context Rule
- Before opening many files, run `npm run ai:context` to get a compact map of the project, routes, modules, business rules, tests, recent changes, and git status.
- Check relevant docs in `node_modules/next/dist/docs/` if Next.js version differences appear.

## Mission
Analyze Milestone 1 Item 1: Centralizing active season state in `lib/admin-store.ts`.
1. Inspect how `zustand` is installed and how `persist` middleware can be used safely in Next.js App Router (handling hydration mismatch / SSR vs client).
2. Trace all 5 admin pages currently using `supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()`:
   - `app/admin/capture/page.tsx`
   - `app/admin/calendar/page.tsx`
   - `app/admin/teams/page.tsx`
   - `app/admin/seasons/page.tsx`
   - `app/admin/eligibility/page.tsx`
   - `app/admin/page.tsx`
3. Define the exact Zustand store interface, initial state hydration, localStorage key (`selected_admin_season_id`), and fallback logic (if stored season is invalid or inactive, pick the first active season).
4. Provide a concrete, step-by-step implementation strategy for Worker.
5. Deliver handoff.md in your working directory.

## 2026-09-03T20:19:43Z
You are M1 Explorer 1: Zustand Admin Store Architecture.
Working directory: d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_1
Original Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Project Scope: d:\liga-nochixtlan-js\PROJECT.md
Prior Analysis: d:\liga-nochixtlan-js\.agents\explorer_regression_1\regression_analysis.md
DISPATCH: d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_1\DISPATCH.md

Analyze Milestone 1 Item 1: Centralizing active season state in lib/admin-store.ts.
1. Inspect how zustand is installed and how persist middleware can be used safely in Next.js App Router.
2. Trace all admin pages currently using supabase.from('seasons').select('id').eq('is_active', true).limit(1).single().
3. Define exact Zustand store interface, initial state hydration, localStorage key (selected_admin_season_id), and fallback logic.
4. Formulate concrete implementation plan for Worker.
5. Deliver handoff.md in your working directory and message orchestrator when done.
