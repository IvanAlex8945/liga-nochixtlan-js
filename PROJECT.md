# Project: Liga Nochixtlán — Admin Panel Repair & UX/UI Redesign

## Architecture
- **Framework**: Next.js 16 (Turbopack, App Router) with React 19.
- **UI Library**: Ant Design v6 (`antd`), `@ant-design/icons`, Tailwind CSS v4.
- **State Management**: TanStack React Query (`@tanstack/react-query`) for server state, Zustand (`zustand`) for global Admin client state (Active Season Store: `lib/admin-store.ts`).
- **Data & Auth**: Supabase PostgreSQL database via `@supabase/ssr` / `@supabase/supabase-js`.
- **Layout Model**: Fluid high-density responsive shell (`AdminLayout.tsx`) replacing rigid 960px bounding box, optimized for 1366×768 desktop and 390px/430px mobile viewport.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Persistent Active Season Store | Centralize season selection in Zustand store with localStorage & URL sync, eliminating deterministic reset to Season 3 on reload | M1 | explorer_regression_1, spec_miner_1 |
| 2 | React Query Cache Invalidation on Capture | Invalidate `['matches-programmed', seasonId]`, `['standings', seasonId]` upon `saveMatchResult` in CaptureForm | M1 | explorer_regression_1 |
| 3 | Supabase Browser Client Synchronization | Ensure browser client properly inherits auth session cookies and tokens for all admin mutations | M1 | explorer_regression_1 |
| 4 | Match Schema Constraint Compliance | Ensure match inserts always specify required `vuelta` column ('ida', 'vuelta', 'liguilla') avoiding error 23514 | M1 | explorer_regression_1 |
| 5 | Liguilla Roster Display & Soft Delete Integrity | Prevent hard rejection of players in playoff capture and handle FK error 23503 with soft-deletes | M1 | explorer_regression_1, spec_miner_1 |
| 6 | Fluid High-Density App Shell | Remove `maxWidth: 960` constraint in `AdminLayout.tsx`, expand to fluid max-w-7xl for 1366×768 / 1920×1080 | M2 | explorer_ux_arch_1, spec_miner_1 |
| 7 | Contextual Topbar | Persistent header displaying active season selector, breadcrumbs, and user session badge on desktop and mobile | M2 | explorer_ux_arch_1, ORIGINAL_REQUEST |
| 8 | Mobile Navigation Drawer | Replace overflowing horizontal scroll strip with an accessible Ant Design Drawer including reachable logout button | M2 | explorer_ux_arch_1 |
| 9 | Operational Command Dashboard | Redesign `/admin/page.tsx` with active season summary, KPI cards (played, pending, teams, progress), pending match alerts, and direct action shortcuts | M2 | explorer_ux_arch_1, ORIGINAL_REQUEST |
| 10 | Teams Instant Search & A-Z Sort | Add live search input with debounce, alphabetical strip/sorting, and clear filter options | M3 | explorer_ux_arch_1, ORIGINAL_REQUEST |
| 11 | Teams Results Counter & Action Clarity | Add `X de Y equipos` feedback counter, "Limpiar filtros" button, and labeled/tooltip action buttons | M3 | explorer_ux_arch_1, ORIGINAL_REQUEST |
| 12 | Calendar Action Hierarchy | Prioritize `+ Nuevo Partido` as primary button; group secondary tools (Asistente, WhatsApp, Liguilla) | M3 | explorer_ux_arch_1, ORIGINAL_REQUEST |
| 13 | Calendar Filters & Results Counter | Streamline redundant status filters, add "Limpiar filtros" button, and display `X de Y partidos` counter | M3 | explorer_ux_arch_1, ORIGINAL_REQUEST |
| 14 | Guided Match Selector | Group matches in `/admin/capture` by pending first with distinct visual badges, then completed matches | M4 | explorer_ux_arch_1, ORIGINAL_REQUEST |
| 15 | Sticky Match Context Header | Ensure match score, teams, and round remain sticky at the top during long lineup scrolling | M4 | explorer_ux_arch_1, ORIGINAL_REQUEST |
| 16 | Keyboard Navigation Optimization | Smooth `Tab`/`Shift+Tab` flow between attendance checkbox and points/triples; assign `tabIndex={-1}` to auxiliary buttons | M4 | explorer_ux_arch_1, ORIGINAL_REQUEST |
| 17 | Double-Submit Form Protection | Disable save button (`disabled={saving}`) and show loading spinner during `handleSave` in `CaptureForm.tsx` | M4 | explorer_ux_arch_1, ORIGINAL_REQUEST |
| 18 | Unequivocal Capture Feedback | Display persistent confirmation state with match score summary and quick shortcut to "Capturar siguiente partido" | M4 | explorer_ux_arch_1, ORIGINAL_REQUEST |
| 19 | Mobile Attendance Table Fix | Remove or adapt 414px fixed left columns in `PlayerAttendanceTable.tsx` on screens < 768px (390px/430px) so inputs are fully reachable | M4 | explorer_ux_arch_1 |
| 20 | E2E Test Suite Infrastructure & Coverage | Build comprehensive automated test suite (Tiers 1-4) verifying persistence, search, filters, capture, and responsive layouts | E2E Track / M5 | ORIGINAL_REQUEST |
| 21 | Adversarial Coverage Hardening | Run white-box stress testing and edge-case verification (Tier 5) to guarantee zero regression | M5 | Project Pattern |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Test Track | Design test infrastructure (`TEST_INFRA.md`) and comprehensive test suite across Tiers 1-4; publish `TEST_READY.md` | none | DONE |
| M1 | Data Layer & Persistence Regression Repair (R1) | Implement `admin-store.ts`, unify Supabase client auth, add React Query cache invalidations in capture, fix `vuelta` constraint | none | DONE |
| M2 | App Shell, Topbar & Operational Dashboard (R2.1, R2.2) | Redesign `AdminLayout.tsx` (remove 960px cap, add Topbar, mobile Drawer), redesign `/admin/page.tsx` with KPIs & alerts | M1 | IN_PROGRESS |
| M3 | Teams, Players & Calendar Optimization (R2.3, R2.4) | Standardize filter bar, A-Z sort, instant search, counters, action hierarchy in `/admin/teams` and `/admin/calendar` | M1, M2 | PLANNED |
| M4 | Capture V2 Guided Workflow & Responsive Polish (R2.5, R2.6) | Guided match selector, sticky header, Tab navigation, double-submit protection, unequivocal feedback, 390px mobile table fix | M1, M2 | PLANNED |
| M5 | Final E2E Test Pass & Adversarial Hardening | Pass 100% of E2E tests (Tiers 1-4) and execute Tier 5 adversarial stress verification | E2E, M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### `lib/admin-store.ts` ↔ Admin Pages & Components
```typescript
export interface AdminStore {
  selectedSeasonId: number | null;
  setSelectedSeasonId: (seasonId: number | null) => void;
  initializeSeason: (activeSeasons: { id: number; name: string }[]) => void;
}
```
- Backed by Zustand with `persist` middleware storing `selected_admin_season_id` in `localStorage`.
- Syncs optionally with `?season=<id>` URL search param.

### `lib/supabase.ts` / Browser Client ↔ Server Actions & Mutations
- Client-side code importing Supabase client must use a single client instance that carries authentication cookies and active session tokens.
- Anonymous requests must not silently fail on authenticated admin operations.

### `CaptureForm` ↔ TanStack Query Cache
```typescript
// On save completion in CaptureForm:
await queryClient.invalidateQueries({ queryKey: ['matches-programmed', seasonId] });
await queryClient.invalidateQueries({ queryKey: ['matches-recent', seasonId] });
await queryClient.invalidateQueries({ queryKey: ['standings', seasonId] });
```

### Match Creation Contract
- Every insert into `matches` table must include:
```typescript
{
  season_id: number;
  home_team_id: number;
  away_team_id: number;
  status: 'Programado' | 'Pendiente';
  vuelta: 'ida' | 'vuelta' | 'liguilla'; // Required by PostgreSQL check constraint matches_vuelta_check
}
```

## Code Layout
- `lib/admin-store.ts`: Global Zustand state for active season and UI preferences.
- `lib/supabase.ts` & `lib/supabase/client.ts`: Supabase client definitions.
- `lib/saveMatch.ts`: Match persistence, score calculation, Liguilla best-of-3 automation.
- `app/components/AdminLayout.tsx`: App Shell, Topbar, Sidebar, Mobile Drawer.
- `app/components/AdminFilterBar.tsx`: Shared filter, search, reset, and counter toolbar.
- `app/admin/page.tsx`: Operational Dashboard.
- `app/admin/teams/page.tsx`: Teams and Players management.
- `app/admin/calendar/page.tsx`: Matches calendar and scheduling.
- `app/admin/capture/page.tsx` & `app/components/CaptureForm.tsx`: Guided match result capture.
- `app/components/PlayerAttendanceTable.tsx`: Player lineup, attendance checkboxes, points/triples inputs.
- `tests/e2e/`: Requirement-driven E2E test suite.
