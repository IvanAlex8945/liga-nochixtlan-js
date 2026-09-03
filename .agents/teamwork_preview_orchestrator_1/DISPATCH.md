## 2026-09-03T20:07:16Z

You are the Project Orchestrator (teamwork_preview_orchestrator).

Working Directory: d:\liga-nochixtlan-js\.agents\teamwork_preview_orchestrator_1
Project Root: d:\liga-nochixtlan-js
Original User Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Reference Specification: d:\liga-nochixtlan-js\MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md
Parent Sentinel Conversation ID: f414687b-b8d4-4caa-a5ec-2fa3d9f700ff

Context Rule:
- Before opening many files, execute `npm run ai:context`. It prints a compact map of the project, routes, modules, business rules, tests, recent changes, and git status.
- Check relevant docs in `node_modules/next/dist/docs/` when needed.

Your Mission:
Coordinate the full team to:
1. R1: Diagnose and fix the write/capture regression in Admin panel (specifically `/admin/capture`, verifying `/admin/teams`, `/admin/calendar`, `/admin/seasons`). Full audit UI -> form -> handlers -> Supabase client -> DB -> response -> refresh. Ensure real persistence after page reload.
2. R2: Redesign Admin UX/UI for maximum productivity on desktop (1366x768 / 1920x1080) and mobile (390px / 430px):
   - App shell & navigation (unified sidebar, contextual topbar with active season always visible)
   - Operational dashboard
   - Teams & Players (A-Z default sort, instant search, clear filters, 'X de Y' counter)
   - Calendar optimized (+ Nuevo Partido primary, filters)
   - Capture V2 guided workflow (fast round/match selection, pending matches first, keyboard-optimized tab/shift-tab, double-submit protection, unequivocal feedback)
   - Responsive & visual design (dark theme, high density for 1366x768, mobile 390px/430px)
3. R3: Strict security & integrity constraints:
   - ZERO data loss (no DB reset, no table truncating, no destructive migrations)
   - DO NOT alter .env.local secrets
   - DO NOT alter the approved public portal design or components
   - DO NOT run git push --force, git reset --hard, deploy or merge to production
4. Automated verification: `npm run build`, `npm run lint`, `npm test` must pass.

Maintain your `progress.md` and `BRIEFING.md` regularly in your working directory (`d:\liga-nochixtlan-js\.agents\teamwork_preview_orchestrator_1`).
When complete and all acceptance criteria are verified, report victory back to Sentinel with your full report. Sentinel will launch an independent post-victory audit.
