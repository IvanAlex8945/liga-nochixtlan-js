# Task Dispatch — Admin UX & Architecture Explorer

Working directory: d:\liga-nochixtlan-js\.agents\explorer_ux_arch_1
Original Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Reference Specification: d:\liga-nochixtlan-js\MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md

## Context Rule
- Before opening many files, run `npm run ai:context` to get a compact map of the project, routes, modules, business rules, tests, recent changes, and git status.
- Check relevant docs in `node_modules/next/dist/docs/` if Next.js version differences appear.

## Mission
Investigate the current Admin UI/UX architecture and identify gaps against R2 specifications:
1. Examine App Shell & Navigation: current sidebar, topbar, active season display, breadcrumbs, user info, duplication/redundancy.
2. Examine Dashboard: current metrics, pending matches alerts, quick shortcuts.
3. Examine Teams & Players: sorting (A-Z default?), search implementation (instant?), filter state, "Limpiar filtros" button, "X de Y" result counter.
4. Examine Calendar: filters, season progress indicator, action hierarchy (+ Nuevo Partido vs secondary tools).
5. Examine Capture V2 flow: current journey for selecting season, round, match; pending matches ordering; sticky match context; score/stats input fields; keyboard navigation (Tab/Shift+Tab); double-submit protection; feedback states.
6. Examine Responsive & Visual Design: dark theme styling, spacing/padding density for 1366x768, mobile behavior (390px, 430px).
7. Identify existing UI library/components (e.g. Tailwind, Lucide icons, Radix, Shadcn, custom components).

Write your findings to:
`d:\liga-nochixtlan-js\.agents\explorer_ux_arch_1\admin_ux_architecture.md`
and deliver a complete `handoff.md` in your working directory.

## 2026-09-03T20:07:58Z
Received dispatch from parent orchestrator to explore Admin UX & Architecture against R2 requirements.

