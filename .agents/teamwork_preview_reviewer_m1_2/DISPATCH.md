# Task Dispatch — M1 Reviewer 2: Capture Cache, Constraints & Integrity

Working directory: d:\liga-nochixtlan-js\.agents\teamwork_preview_reviewer_m1_2
Project Scope: d:\liga-nochixtlan-js\PROJECT.md
Original Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Worker Handoff: d:\liga-nochixtlan-js\.agents\worker_m1_1\handoff.md
Test Suite Certification: d:\liga-nochixtlan-js\TEST_READY.md

## Mission
Independently review the work implemented by `worker_m1_1` for Milestone 1:
1. Review `app/components/CaptureForm.tsx` and `app/admin/capture/page.tsx`:
   - Verify TanStack Query cache invalidation occurs properly on save.
   - Verify double-submit protection (`loading={saving}` and `disabled={saving}`).
2. Review `app/admin/calendar/MissingMatchesModal.tsx`:
   - Verify `matches_vuelta_check` constraint ('ida', 'vuelta', 'liguilla') is satisfied.
3. Review `app/admin/teams/page.tsx` and `app/admin/capture/page.tsx`:
   - Verify non-destructive soft delete on FK error 23503 (`status: 'Baja'`, zero data loss).
   - Verify Liguilla eligibility handling does not censor roster capture.
4. Execute verification commands:
   - `npm test`
   - `npx vitest run tests/e2e`
   - `npm run build`
   - `npm run lint`
5. Render a clear verdict: **APPROVE** or **REQUEST_CHANGES** with precise technical evidence.
6. Deliver handoff.md in your working directory and notify the orchestrator.
