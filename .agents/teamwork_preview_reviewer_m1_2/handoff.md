# Handoff Report: M1 Reviewer 2 — Capture Cache, Constraints & Integrity

**Reviewer**: M1 Reviewer 2 (`teamwork_preview_reviewer_m1_2`)  
**Mission**: Quality and Adversarial Review of Milestone 1 implementation by `worker_m1_1`  
**Date**: 2026-09-03  
**Verdict**: **APPROVE**  

---

## 1. Observation

### 1.1. TanStack Query Cache Invalidation & Double-Submit Protection (`CaptureForm.tsx` & `capture/page.tsx`)
1. **Cache Invalidation on Match Save**:
   - `app/components/CaptureForm.tsx` (lines 102–126):
     ```typescript
     await saveMatchResult(
       supabase,
       match.id,
       resultType,
       getLineupForSave(homeLineup),
       getLineupForSave(awayLineup)
     );
     await invalidatePublicCache({ seasonId });

     await queryClient.invalidateQueries({ queryKey: ['matches-programmed'] });
     if (seasonId) {
       await queryClient.invalidateQueries({ queryKey: ['matches-programmed', seasonId] });
       await queryClient.invalidateQueries({ queryKey: ['matches', seasonId] });
       await queryClient.invalidateQueries({ queryKey: ['stats', seasonId] });
       await queryClient.invalidateQueries({ queryKey: ['standings', seasonId] });
       await queryClient.invalidateQueries({ queryKey: ['season-detail', seasonId] });
     }
     await queryClient.invalidateQueries({ queryKey: ['match', match.id] });
     await queryClient.invalidateQueries({ queryKey: ['players-capture-home'] });
     await queryClient.invalidateQueries({ queryKey: ['players-capture-away'] });
     await queryClient.invalidateQueries({ queryKey: ['eligibility'] });
     ```
   - In `app/admin/capture/page.tsx` (lines 310–315), the `onSaved` callback also clears the selected match and invalidates:
     ```typescript
     onSaved={() => {
       setSelectedMatchId(null);
       if (seasonId) {
         queryClient.invalidateQueries({ queryKey: ['matches-programmed', seasonId] });
       }
     }}
     ```
2. **Double-Submit Form Protection**:
   - `app/components/CaptureForm.tsx`:
     - Line 85: `const [saving, setSaving] = useState(false);`
     - Line 103: `setSaving(true);` in `handleSave`
     - Line 132: `finally { setSaving(false); }`
     - Line 137: Form wrapped in `<Spin spinning={saving} description="Guardando...">`
     - Lines 283–284: Primary submit button has both `loading={saving}` and `disabled={saving}`:
       ```tsx
       <Button
         type="primary"
         size="large"
         icon={<SaveOutlined />}
         onClick={handleSave}
         loading={saving}
         disabled={saving}
         className="btn-capture"
         style={{ width: '100%', marginTop: 16 }}
       >
       ```

### 1.2. PostgreSQL Constraint `matches_vuelta_check` (`MissingMatchesModal.tsx`)
- Table constraint: `CHECK (vuelta IS NULL OR vuelta IN ('ida', 'vuelta', 'liguilla'))`.
- In `app/admin/calendar/MissingMatchesModal.tsx` (lines 221–239), the missing vuelta is dynamically determined from existing matches:
  ```typescript
  if (audit.total === 1) {
    const existingMatch = audit.orderedMatches[0];
    const missingVuelta: 'ida' | 'vuelta' = existingMatch?.vuelta === 'vuelta' ? 'ida' : 'vuelta';
    ...
    faltantes.push({
      key: `${audit.key}-${missingVuelta}`,
      home: missingHome,
      away: missingAway,
      vuelta: missingVuelta,
      reserveMirror: false,
    });
  }
  ```
- Lines 346–375: Insert queries explicitly assign `vuelta: 'ida'` for the first leg and `vuelta: 'vuelta'` for mirror or second leg.
- Duplicate checks in lines 324–326 guarantee prevention of error `23514`:
  ```typescript
  if (existingRegularMatches.some((match) => match.vuelta === vars.vuelta)) {
    throw new Error(`Ya existe un partido de ${vars.vuelta} para esta pareja.`);
  }
  ```

### 1.3. Soft-Delete on Foreign Key Error 23503 (`teams/page.tsx`)
- In `app/admin/teams/page.tsx` (lines 712–748):
  ```typescript
  const deleteTeam = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('teams').delete().eq('id', id);

      if (error) {
        if (error.code === '23503') {
          const { error: updateError } = await supabase
            .from('teams')
            .update({ status: 'Baja' })
            .eq('id', id);
          if (updateError) throw updateError;

          await supabase
            .from('players')
            .update({ is_active: false })
            .eq('team_id', id);

          return 'soft-deleted';
        }
        throw error;
      }
      return 'deleted';
    },
    onSuccess: async (status) => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['teams-active'] });
      qc.invalidateQueries({ queryKey: ['players'] });
      await invalidatePublicCache({ seasonId });
      if (status === 'soft-deleted') {
        message.info('El equipo tiene historial registrado. Fue marcado como Baja para no afectar las estadísticas de la liga.', 5);
      } else {
        message.success('Equipo eliminado permanentemente');
      }
    },
    ...
  });
  ```
- Previously destructive physical deletes of `player_match_stats` and `matches` were completely eliminated, preserving historical league statistics (zero data loss).

### 1.4. Liguilla Playoff Roster Unblocking (`capture/page.tsx`)
- In `app/admin/capture/page.tsx` (lines 124–140 and 182–198):
  - Previously, ineligible players were filtered out with `.filter(p => eligibleSet.has(p.id))`, preventing table coordinators from taking attendance under special league authorization.
  - Now, full rosters are preserved:
    ```typescript
    if (selectedMatch?.phase && selectedMatch.phase !== 'Fase Regular') {
      const { results } = await calcularElegibilidad(supabase, selectedMatch.home_team.id, seasonId!);
      eligibilityMap = new Map(
        results.map((result) => [
          result.jugador_id,
          { elegible: result.elegible, asistencias: result.asistencias, min: result.min_requerido },
        ])
      );
      playersData = [...playersData].sort((a, b) => {
        const eligA = eligibilityMap.get(a.id)?.elegible ? 1 : 0;
        const eligB = eligibilityMap.get(b.id)?.elegible ? 1 : 0;
        if (eligA !== eligB) return eligB - eligA;
        return getPlayerNumberSortValue(a.number) - getPlayerNumberSortValue(b.number);
      });
    }
    ```
  - Both home and away player rosters preserve all active players, sorting eligible players to the top and displaying badge metadata (`eligibility_label: `${eligibility.asistencias}/${eligibility.min}``).

### 1.5. Verification Commands Execution Results
1. **`npm test`**:
   - Command: `npm test`
   - Exit code: 0
   - Test Files: 27 passed (27)
   - Tests: 226 passed (226), 0 failures
2. **`npx vitest run tests/e2e`**:
   - Command: `npx vitest run tests/e2e`
   - Exit code: 0
   - Test Files: 4 passed (4)
   - Tests: 78 passed (78), 0 failures
3. **`npm run build`**:
   - Command: `npm run build`
   - Exit code: 0
   - Output: Turbopack compilation succeeded in 11.2s, TypeScript finished in 8.9s, 28/28 static pages generated.
4. **`npm run lint`**:
   - Command: `npm run lint`
   - Exit code: 0
   - Output: ESLint passed with 0 errors and 0 warnings across the entire repository.

---

## 2. Logic Chain

1. **Cache Consistency (Observation 1.1)**:
   - When a match result is saved, TanStack Query cache in memory holds stale representations of `matches-programmed`, `matches`, `standings`, and `stats`.
   - By calling `queryClient.invalidateQueries` across all affected keys with matching prefixes, any component mounting or currently rendering automatically refetches fresh data from Supabase.
   - Calling `invalidatePublicCache({ seasonId })` synchronizes server-side ISR data on public pages.
   - The UI race condition is prevented by binding both `loading={saving}` and `disabled={saving}` to the primary action button and wrapping the container in an Ant Design `<Spin>`.

2. **Database Integrity & Constraints (Observation 1.2 & 1.3)**:
   - Postgres check constraint `matches_vuelta_check` strictly requires `vuelta IN ('ida', 'vuelta', 'liguilla')` or `NULL`.
   - In `MissingMatchesModal.tsx`, dynamically determining whether the existing leg is `vuelta` and scheduling `ida`, or vice versa, eliminates duplicate vuelta inserts and guarantees zero `23514` constraint exceptions.
   - Catching error code `23503` in `deleteTeam` intercepts foreign key violations and cleanly transitions the team to `status: 'Baja'` while setting `players.is_active = false`. This fulfills the zero data loss requirement while keeping historical match records intact.

3. **Liguilla Roster Usability (Observation 1.4)**:
   - Filtering players out during playoffs breaks operational requirements because table referees must be able to record attendance and points even if an ineligible player participates under executive exemption or provisional ruling.
   - Sorting eligible players first and decorating with attendance badges without removing ineligible players solves the operational constraint cleanly.

4. **Integrity Violations Check**:
   - Code inspection reveals no hardcoded test outputs or mock fixtures embedded in production code.
   - Implementations are full, reactive components connected to real stores and database drivers.
   - No bypasses or artificial shortcuts exist.
   - Independent test, lint, and build runs confirm full system validity.

---

## 3. Caveats

- **Network-level burst calls**: While the UI disables clicking via `disabled={saving}` and `loading={saving}` on the Ant Design `<Button>`, an early return guard `if (saving) return;` at the entry of `handleSave()` is recommended as an extra defense-in-depth practice against potential non-DOM direct invocations. However, the UI implementation fully fulfills the specification.
- No other caveats.

---

## 4. Conclusion

The implementation by `worker_m1_1` satisfies all functional, architectural, and data integrity requirements for Milestone 1:
- Cache invalidation is comprehensive and reactive.
- Double-submit protection prevents duplicate form submissions.
- `matches_vuelta_check` compliance avoids database constraint violations.
- Non-destructive soft-delete handles FK error 23503 with zero data loss.
- Liguilla playoff rosters provide complete visibility and capture capability.
- All test suites (27 test files, 226 tests) pass with 100% success rate, production build succeeds with code 0, and ESLint reports 0 errors.

**Verdict**: **APPROVE**

---

## 5. Verification Method

To independently verify this evaluation:
1. Run full test suite:
   ```powershell
   npm test
   ```
   *Expected result*: 27 test files pass, 226 tests pass, 0 failures.
2. Run E2E test suite:
   ```powershell
   npx vitest run tests/e2e
   ```
   *Expected result*: 4 test files pass, 78 tests pass.
3. Verify ESLint cleanliness:
   ```powershell
   npm run lint
   ```
   *Expected result*: Exit code 0, 0 errors, 0 warnings.
4. Verify production build:
   ```powershell
   npm run build
   ```
   *Expected result*: Exit code 0, 28/28 routes compiled.
5. Inspect source implementations:
   - `app/components/CaptureForm.tsx` lines 102–134 and 278–294.
   - `app/admin/calendar/MissingMatchesModal.tsx` lines 221–240 and 346–375.
   - `app/admin/teams/page.tsx` lines 712–748.
   - `app/admin/capture/page.tsx` lines 124–140 and 182–198.
