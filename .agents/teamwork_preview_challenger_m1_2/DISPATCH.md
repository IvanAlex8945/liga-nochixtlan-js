# Task Dispatch — M1 Challenger 2: Concurrency, Double-Submit & Constraint Stress Testing

Working directory: d:\liga-nochixtlan-js\.agents\teamwork_preview_challenger_m1_2
Project Scope: d:\liga-nochixtlan-js\PROJECT.md
Original Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Worker Handoff: d:\liga-nochixtlan-js\.agents\worker_m1_1\handoff.md

## Mission
Adversarially challenge and empirically verify match saving, query invalidation, double-submit protection, and database constraints:
1. Write and execute empirical stress tests / scripts evaluating:
   - Rapid concurrent double-click and multiple-click submissions on `CaptureForm.tsx` save handler. Verify that in-flight requests cannot be duplicated.
   - Cache invalidation verification: simulate query cache mutation and confirm that `['matches-programmed']`, `['matches']`, `['standings']`, and `['stats']` are genuinely invalidated.
   - Test insertions violating and respecting `matches_vuelta_check` constraint across edge cases.
   - Test soft-delete on foreign key violation `23503` ensuring zero historical data loss.
2. Confirm whether the implementation genuinely prevents double-submit and database constraint violations.
3. Render a clear verdict: **APPROVE** or **CHALLENGE_FAILED** with empirical proof.
4. Deliver handoff.md in your working directory and notify the orchestrator.


## 2026-09-03T20:34:04Z
You are M1 Challenger 2: Concurrency, Double-Submit & Constraint Stress Testing.
Working directory: d:\liga-nochixtlan-js\.agents\teamwork_preview_challenger_m1_2
Project Scope: d:\liga-nochixtlan-js\PROJECT.md
Original Request: d:\liga-nochixtlan-js\.agents\ORIGINAL_REQUEST.md
Worker Handoff: d:\liga-nochixtlan-js\.agents\worker_m1_1\handoff.md
DISPATCH: d:\liga-nochixtlan-js\.agents\teamwork_preview_challenger_m1_2\DISPATCH.md

Adversarially challenge match saving, query invalidation, double-submit protection, and database constraints:
1. Write and run stress test scripts for concurrent save submissions, cache invalidation verification, matches_vuelta_check constraint tests, and FK 23503 soft-delete verification.
2. Empirically verify whether double-submit and constraint violations are prevented.
3. Render APPROVE or CHALLENGE_FAILED in handoff.md with evidence and message orchestrator when done.
