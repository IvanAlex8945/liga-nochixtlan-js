# Task Dispatch — M1 Explorer 2: Supabase Browser Client Unification

Working directory: d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_2
Original Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Project Scope: d:\liga-nochixtlan-js\PROJECT.md
Prior Analysis: d:\liga-nochixtlan-js\.agents\explorer_regression_1\regression_analysis.md

## Context Rule
- Before opening many files, run `npm run ai:context` to get a compact map of the project, routes, modules, business rules, tests, recent changes, and git status.
- Check relevant docs in `node_modules/next/dist/docs/` if Next.js version differences appear.

## Mission
Analyze Milestone 1 Item 2: Unifying the Supabase client across client-side Admin pages and mutations.
1. Inspect `lib/supabase.ts` and `lib/supabase/client.ts`.
2. Determine how `lib/supabase.ts` is imported across all admin components and ensure backward compatibility so existing imports do not break.
3. Investigate if `lib/supabase.ts` in the browser can use `createBrowserClient` from `@supabase/ssr` to ensure auth cookies/tokens are sent with all PostgREST requests, while remaining safe if called on server or in scripts.
4. Formulate the concrete implementation strategy for Worker.
5. Deliver handoff.md in your working directory.
