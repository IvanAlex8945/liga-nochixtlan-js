# Task Dispatch — Milestone 2 Worker: App Shell, Topbar & Operational Dashboard

Working directory: d:\liga-nochixtlan-js\.agents\worker_m2_1
Project Root: d:\liga-nochixtlan-js
Original User Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Reference Specification: d:\liga-nochixtlan-js\MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md
Project Scope: d:\liga-nochixtlan-js\PROJECT.md
Architecture Reference: d:\liga-nochixtlan-js\.agents\explorer_ux_arch_1\admin_ux_architecture.md

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Exclusive File Ownership
- `app/components/AdminLayout.tsx`
- `app/admin/page.tsx`

## Implementation Tasks
### 1. App Shell & Navigation Redesign (`app/components/AdminLayout.tsx`)
1. **Remove Fixed 960px Constraint**:
   - Eliminate `maxWidth: 960` in `<Content>`.
   - Use fluid container with max-width `max-w-7xl` (1280px/1400px) or full width with high-density padding (`padding: '16px 24px'`).
   - Optimize for laptops (1366×768) and desktops (1920×1080) with dense spacing, clean borders (`#262626` / `#333`), and dark background (`#121212`).
2. **Contextual Topbar**:
   - Add a fixed/sticky Topbar (`<Header>`) on desktop and mobile.
   - Include:
     * Brand / App badge.
     * Persistent Active Season selector or badge (reading/writing `useAdminStore`).
     * Route breadcrumbs (e.g. `Admin / Inicio`, `Admin / Equipos`, `Admin / Captura`).
     * User profile badge / role indicator.
     * Logout action.
     * Mobile hamburger button (`MenuOutlined`) toggling mobile Drawer.
3. **Mobile Navigation Drawer**:
   - Replace horizontal scroll strip with an accessible Ant Design `<Drawer open={drawerOpen} onClose={...}>`.
   - Include all navigation modules with their icons.
   - Include active season context and accessible "Cerrar Sesión" button at the bottom of the drawer.
4. **Preserve Public Site**:
   - DO NOT alter any public portal files or public layout components.

### 2. Operational Dashboard Redesign (`app/admin/page.tsx`)
1. **Active Season Summary**:
   - Header with active season name, category, and status.
2. **Operational KPI Metrics**:
   - Teams registered in active season.
   - Matches played vs total scheduled (% season progress).
   - Pending matches needing capture.
   - Active players registered.
3. **Pending Matches Alert Banner / Card**:
   - Real-time list of uncaptured matches from the current/latest jornada with direct "Capturar" action button linking to `/admin/capture`.
4. **Quick Action Shortcuts**:
   - Direct shortcut buttons: `+ Nuevo Partido` (to `/admin/calendar`), `Capturar Resultado` (to `/admin/capture`), `+ Nuevo Equipo` (to `/admin/teams`), `Ver Elegibilidad` (to `/admin/eligibility`).
5. **Clean Dark Theme & Zero Data Loss**:
   - No mock data: fetch real metrics via Supabase client / React Query.
   - Responsive grid (`<Row gutter={[16, 16]}>`) adapting cleanly to mobile (390px) and laptop (1366×768).

### 3. Verification Commands
- `npm test`
- `npx vitest run tests/e2e`
- `npm run lint`
- `npm run build`
All must exit with code 0.

Write `handoff.md` in your working directory and notify the orchestrator.

## 2026-09-03T20:41:01Z
You are the Implementation Worker for Milestone 2: App Shell, Topbar & Operational Dashboard.
Working directory: d:\liga-nochixtlan-js\.agents\worker_m2_1
Project Root: d:\liga-nochixtlan-js
Original User Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Reference Specification: d:\liga-nochixtlan-js\MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md
Project Scope: d:\liga-nochixtlan-js\PROJECT.md
Architecture Reference: d:\liga-nochixtlan-js\.agents\explorer_ux_arch_1\admin_ux_architecture.md
DISPATCH assignment: d:\liga-nochixtlan-js\.agents\worker_m2_1\DISPATCH.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive file ownership:
- app/components/AdminLayout.tsx
- app/admin/page.tsx

Execute all tasks in DISPATCH.md:
1. Redesign app/components/AdminLayout.tsx:
   - Remove maxWidth: 960 limitation, make layout responsive & fluid for 1366x768 and 1920x1080 with high density.
   - Implement fixed/sticky contextual Topbar with persistent active season selector/badge (using useAdminStore), route breadcrumbs, user badge, and mobile menu button.
   - Implement accessible mobile Drawer with full navigation links and reachable logout button.
   - Do NOT modify public pages or public layout.
2. Redesign app/admin/page.tsx (Operational Command Dashboard):
   - Active season summary banner.
   - Real operational KPI cards (teams, played vs scheduled progress %, pending matches, active players).
   - Alerts section for pending uncaptured matches with direct "Capturar" action.
   - Quick action shortcuts (+ Nuevo Partido, Capturar Resultado, Nuevo Equipo, Elegibilidad).
   - Adapt responsive layout for 390px, 430px, 1366x768.
3. Verify commands: npm test, npx vitest run tests/e2e, npm run lint, npm run build.
4. Deliver a complete handoff.md in your working directory and notify the orchestrator.
