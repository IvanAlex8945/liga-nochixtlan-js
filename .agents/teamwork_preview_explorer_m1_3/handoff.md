# Reporte de Auditoría e Implementación Técnica: Milestone 1 (Items 3, 4 y 5)
**Investigador:** M1 Explorer 3: Cache Invalidation & DB Constraints (`teamwork_preview_explorer_m1_3`)  
**Directorio de Trabajo:** `d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_3`  
**Destinatario:** Lead Integrator / Orchestrator (`c408cb50-b8af-4c7b-a8ad-f5a4c4e36c02`) & M1 Worker  
**Fecha:** 2026-09-03  

---

## 1. Observation

### 1.1. Item 1: TanStack Query Cache Invalidation en Captura
- **Archivo `app/components/CaptureForm.tsx:100-118`:**
  ```tsx
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMatchResult(
        supabase,
        match.id,
        resultType,
        getLineupForSave(homeLineup),
        getLineupForSave(awayLineup)
      );
      await invalidatePublicCache({ seasonId });
      message.success('Resultado guardado correctamente');
      onSaved?.();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };
  ```
  **Observación directa:** En `CaptureForm.tsx`, el hook `useQueryClient` de `@tanstack/react-query` **no está importado ni utilizado**. Únicamente se llama a `invalidatePublicCache({ seasonId })`, el cual dispara `POST /api/admin/revalidate-public-data` (revalidación de páginas estáticas Next.js públicas). La caché en memoria de React Query en el navegador jamás se invalida tras guardar.
- **Archivo `app/components/AntdProvider.tsx:8-12`:**
  ```tsx
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  });
  ```
  **Observación directa:** El `staleTime` global es de 30 segundos (`30_000` ms). Por ende, React Query considera que las consultas son frescas durante 30 segundos y no las refresca automáticamente.
- **Archivo `app/admin/capture/page.tsx:89-102` y línea 297:**
  ```tsx
  const { data: matches = [], isLoading: loadingMatches } = useQuery<Match[]>({
    queryKey: ['matches-programmed', seasonId],
    ...
  });
  ...
  <CaptureForm ... onSaved={() => setSelectedMatchId(null)} />
  ```
  **Observación directa:** `CapturePage` tampoco tiene importado ni invoca `useQueryClient`. Al guardar en `CaptureForm`, `onSaved` únicamente deselecciona el partido (`setSelectedMatchId(null)`). Al reaparecer el dropdown de partidos, `['matches-programmed', seasonId]` sigue sirviendo los datos cacheados: el partido recién guardado continúa en estado `Programado`. Si el usuario lo vuelve a seleccionar, las cédulas en `['players-capture-home']` y `['players-capture-away']` también pueden mostrar datos viejos.
- **Archivo `app/components/CaptureForm.tsx:262-276`:**
  ```tsx
  <Button
    type="primary"
    size="large"
    icon={<SaveOutlined />}
    onClick={handleSave}
    className="btn-capture"
    style={{ width: '100%', marginTop: 16 }}
  >
  ```
  **Observación directa:** El componente `<Button>` carece de `loading={saving}` y de `disabled={saving}` (solo existe un `<Spin spinning={saving}>` general). Si el usuario da clic rápidamente dos veces, se disparan dos ejecuciones concurrentes de `saveMatchResult`.

---

### 1.2. Item 2: Restricción PostgreSQL `matches_vuelta_check`
- **Archivo `migration_match_vuelta_phase2.sql:19-20`:**
  ```sql
  ALTER TABLE public.matches
  ADD CONSTRAINT matches_vuelta_check
  CHECK (vuelta IS NULL OR vuelta IN ('ida', 'vuelta', 'liguilla'));
  ```
  En la base de datos de producción rige el constraint `matches_vuelta_check` (código de error `23514`). Si se inserta un registro con un valor inválido o no permitido, PostgreSQL rechaza la transacción.
- **Auditoría completa de puntos de inserción a `matches` en toda la base de código:**
  1. `app/admin/calendar/page.tsx:253-274`: Creación de partido sin cruces previos:
     - Fila 1: asigna explícitamente `vuelta: 'ida'`.
     - Fila 2 (espejo): asigna explícitamente `vuelta: 'vuelta'`.
     - Cumple con la restricción.
  2. `app/admin/calendar/page.tsx:296-303`: Creación de partido cuando ya existe 1 cruce:
     - Línea 280: `const targetLeg: MatchLeg = firstLeg.vuelta === 'vuelta' ? 'ida' : 'vuelta';`
     - Asigna explícitamente `vuelta: targetLeg`.
     - Cumple con la restricción.
  3. `app/admin/calendar/page.tsx:311-318`: Creación de partido de fase eliminatoria (no regular):
     - Asigna explícitamente `vuelta: 'liguilla'`.
     - Cumple con la restricción.
  4. `app/admin/calendar/page.tsx:473, 495, 499`: Generador Round Robin automático:
     - Primera vuelta: asigna explícitamente `vuelta: 'ida'`.
     - Segunda vuelta espejo: asigna explícitamente `vuelta: 'vuelta'`.
     - Cumple con la restricción.
  5. `app/admin/calendar/LiguillaModal.tsx:70, 117, 162, 193, 201`: Inyección de llaves de liguilla:
     - Cuartos: asigna explícitamente `vuelta: 'liguilla'`.
     - Semifinales: asigna explícitamente `vuelta: 'liguilla'`.
     - Final: asigna explícitamente `vuelta: 'liguilla'`.
     - Tercer Lugar: asigna explícitamente `vuelta: 'liguilla'`.
     - Cumple con la restricción.
  6. **DEFECTO DETECTADO en `app/admin/calendar/MissingMatchesModal.tsx:225, 344, 364, 404`:**
     - En la detección de faltantes con 1 juego previo (`audit.total === 1`), línea 225 asigna: `key: `${audit.key}-mirror``.
     - En `attemptCreate` (línea 404): `vuelta: record.key.endsWith('-ida') ? 'ida' : 'vuelta'`.
     - Como la clave termina en `-mirror`, asume ciegamente que el partido faltante es de `'vuelta'`.
     - Si en la base de datos el partido preexistente tenía `vuelta === 'vuelta'`, el faltante real es `'ida'`, pero el modal intenta insertar `'vuelta'`, provocando un error en la línea 317 (`"Ya existe un partido de vuelta para esta pareja"`).
     - Además, en `createMissingMatch` (líneas 338-366), cuando `reserveMirror` es true, la primera fila hereda `...matchVars` (que debe garantizarse que sea `'ida'`) y la segunda tiene `vuelta: 'vuelta'`.
  7. **DEFECTO DETECTADO en `scripts/simulateLiguilla.mjs:41-73`:**
     - Las 13 inserciones de partidos de liguilla omiten completamente la propiedad `vuelta`. Si se ejecuta contra una base donde `vuelta` no acepte `null`, falla inmediatamente con error `23514`.

---

### 1.3. Item 3: Manejo de Soft-Delete en Error FK 23503 y Despliegue de Elegibilidad
- **Archivo `app/admin/teams/page.tsx:983-1009` (`deletePlayer`):**
  ```tsx
  const { error } = await supabase.from('players').delete().eq('id', player.id);
  if (error) {
    if (error.code === '23503') {
      const { error: updateError } = await supabase
        .from('players')
        .update({ is_active: false })
        .eq('id', player.id);
      if (updateError) throw updateError;
      const revokeResult = await revokeCredentialForPlayer(player.id, 'Jugador marcado como baja');
      ...
      return 'soft-deleted';
    }
    throw error;
  }
  ```
  **Observación directa:** El manejo de borrado suave en `deletePlayer` **ya está implementado correctamente**: si PostgreSQL arroja error 23503 (clave foránea referenciada en `player_match_stats`), el jugador no se borra físicamente, sino que se actualiza a `is_active: false` y se revoca su credencial.
- **PELIGRO CRÍTICO en `app/admin/teams/page.tsx:723-750` (`deleteTeam`):**
  ```tsx
  const deleteTeam = useMutation({
    mutationFn: async (id: number) => {
      const { data: teamMatches } = await supabase
        .from('matches')
        .select('id')
        .or(`home_team_id.eq.${id},away_team_id.eq.${id}`);

      const matchIds = (teamMatches ?? []).map((match: { id: number }) => match.id);

      if (matchIds.length > 0) {
        const { error: statsError } = await supabase
          .from('player_match_stats')
          .delete()
          .in('match_id', matchIds);
        if (statsError) throw statsError;
      }

      if (matchIds.length > 0) {
        const { error: matchError } = await supabase
          .from('matches')
          .delete()
          .in('id', matchIds);
        if (matchError) throw matchError;
      }

      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
    },
  ```
  **Observación directa:**
  1. `deleteTeam` intenta **borrar físicamente las estadísticas históricas (`player_match_stats`) y los partidos (`matches`)** de ese equipo, destruyendo datos históricos de otros rivales y violando el requerimiento R3 de CERO pérdida de datos.
  2. Si el equipo tiene jugadores en la tabla `players`, la llamada final `supabase.from('teams').delete().eq('id', id)` falla con error `23503` (`players_team_id_fkey`).
  3. No existe manejo de soft-delete en `deleteTeam`. Sin embargo, la tabla `teams` cuenta con la columna `status: string` (con valores `'Activo'` y `'Baja'`, consultados por ejemplo en `app/admin/calendar/page.tsx:180` y `app/admin/eligibility/page.tsx:39` con `.eq('status', 'Activo')`).
- **DEFECTO en `app/admin/capture/page.tsx:130, 184` (Elegibilidad en Liguilla):**
  ```tsx
  if (selectedMatch?.phase && selectedMatch.phase !== 'Fase Regular') {
    const { results } = await calcularElegibilidad(supabase, selectedMatch.home_team.id, seasonId!);
    const eligibleSet = new Set(results.filter(r => r.elegible).map(r => r.jugador_id));
    eligibilityMap = new Map(
      results.map((result) => [
        result.jugador_id,
        { elegible: result.elegible, asistencias: result.asistencias, min: result.min_requerido },
      ])
    );
    // RECHAZO DURO:
    playersData = sortPlayersByNumber(playersData.filter(p => eligibleSet.has(p.id)));
  }
  ```
  **Observación directa:**
  En partidos de liguilla, los jugadores que no alcanzan el umbral (`floor(totalPartidos / 2) + 1`) son **removidos por completo de `playersData`**.
  En `PlayerAttendanceTable.tsx:133-137`, ya existe código para renderizar el tag de elegibilidad:
  ```tsx
  {row.eligibility_label && (
    <Tag color={row.is_eligible ? 'blue' : 'orange'} style={{ marginInlineEnd: 0 }}>
      {row.eligibility_label}
    </Tag>
  )}
  ```
  Debido al `.filter(p => eligibleSet.has(p.id))` en `CapturePage`, ningún jugador no elegible llega a la tabla. Si la mesa técnica o árbitro autoriza la participación de un jugador con permiso o refuerzo especial, es imposible registrarlo porque desaparece de la vista.

---

## 2. Logic Chain

1. **Caché en Captura:**
   - La llamada a `saveMatchResult` persiste los datos en PostgreSQL.
   - Pero `CaptureForm` y `CapturePage` no invalidan la caché de TanStack Query (`queryClient.invalidateQueries`).
   - Dado que `AntdProvider` define `staleTime = 30_000`, la lista de partidos `['matches-programmed', seasonId]` permanece estancada en memoria.
   - Conclusión: El usuario ve el partido como si no se hubiese guardado y no se actualizan las vistas relacionadas. Al incorporar la invalidación de queries explícita para `matches-programmed`, `matches`, `stats`, `standings`, `season-detail` y cédulas, el refresco es inmediato y automático.

2. **Constraint `matches_vuelta_check`:**
   - PostgreSQL rechaza con `23514` cualquier fila donde `vuelta` no sea `'ida'`, `'vuelta'` o `'liguilla'`.
   - En el calendario regular y Round Robin, la asignación de `vuelta` está bien cubierta.
   - En `MissingMatchesModal.tsx`, la asunción estática de que cualquier partido espejo faltante es de `'vuelta'` causa error si el primer partido jugado fue la vuelta.
   - Conclusión: Derivar dinámicamente la vuelta faltante (`existingMatch?.vuelta === 'vuelta' ? 'ida' : 'vuelta'`) y forzar que toda inserción asigne explícitamente el valor correspondiente elimina de raíz cualquier riesgo de error `23514`.

3. **Soft-Delete e Integridad Referencial (FK 23503):**
   - En `deletePlayer`, la captura de `error.code === '23503'` actualiza `is_active: false`, lo cual previene la pérdida de estadísticas y no rompe la base de datos.
   - En `deleteTeam`, la implementación actual es destructiva e inconsistente: intenta borrar partidos y estadísticas históricas, y si hay jugadores, arroja error 23503 sin resolver.
   - Conclusión: `deleteTeam` debe eliminar la rutina de borrado destructivo de partidos y estadísticas; si el equipo tiene partidos o jugadores asociados (error `23503`), debe marcarse como `{ status: 'Baja' }` y desactivar sus jugadores con `{ is_active: false }`.

4. **Despliegue de Elegibilidad en Liguilla:**
   - La regla deportiva exige visibilidad del estatus de elegibilidad, no censura del roster.
   - Al remover el `.filter(p => eligibleSet.has(p.id))` en `CapturePage` y aprovechar los campos `is_eligible` y `eligibility_label`, todos los jugadores activos permanecen en la tabla con un badge distintivo (azul si es elegible, naranja si no lo es), permitiendo a la mesa de control registrar su asistencia y puntos bajo su criterio o permiso arbitral.

---

## 3. Caveats

1. **Estado de RLS en Producción:** Las mutaciones deben realizarse a través de un cliente autenticado para evitar bloqueos silenciosos en caso de que se refuercen políticas RLS en tablas de juego (ver diagnóstico previo de `lib/supabase/client.ts`).
2. **Historial Previo de `vuelta`:** Algunos partidos históricos creados antes de la Fase 2 podrían tener `vuelta: null`. Las comparaciones como `firstLeg.vuelta === 'vuelta' ? 'ida' : 'vuelta'` manejan esto correctamente asignando `'vuelta'` por defecto si `firstLeg.vuelta` es nulo o `'ida'`.
3. **ESLint en Archivos Nuevos de E2E:** La ejecución de `npm run lint` reportó advertencias de TypeScript (`@typescript-eslint/no-explicit-any`) en `tests/e2e/helpers/test-fixtures.ts` creados por el track E2E. Estos no afectan la lógica funcional ni la suite de pruebas unitarias (`npm test` pasa 138/138), pero deberán ser tipados o limpiados por el especialista de pruebas antes del merge final.


---

## 4. Conclusion & Concrete Implementation Plan for Worker

A continuación se detalla el plan de implementación paso a paso, exacto y de bajo riesgo, listo para ser ejecutado por el Worker:

### Tarea 1: TanStack Query Cache Invalidation & Prevención de Doble Envío
- **Archivo:** `app/components/CaptureForm.tsx`
  1. Importar `useQueryClient` desde `@tanstack/react-query`:
     ```tsx
     import { useQueryClient } from '@tanstack/react-query';
     ```
  2. Obtener la instancia al inicio de `CaptureForm`:
     ```tsx
     const queryClient = useQueryClient();
     ```
  3. En `handleSave`, inmediatamente después de `await invalidatePublicCache({ seasonId });`:
     ```tsx
     await queryClient.invalidateQueries({ queryKey: ['matches-programmed'] });
     if (seasonId) {
       await queryClient.invalidateQueries({ queryKey: ['matches-programmed', seasonId] });
       await queryClient.invalidateQueries({ queryKey: ['matches', seasonId] });
       await queryClient.invalidateQueries({ queryKey: ['stats', seasonId] });
       await queryClient.invalidateQueries({ queryKey: ['standings', seasonId] });
       await queryClient.invalidateQueries({ queryKey: ['season-detail', seasonId] });
     }
     await queryClient.invalidateQueries({ queryKey: ['players-capture-home'] });
     await queryClient.invalidateQueries({ queryKey: ['players-capture-away'] });
     await queryClient.invalidateQueries({ queryKey: ['eligibility'] });
     ```
  4. En el botón de guardado (`<Button ... className="btn-capture">`), agregar protección contra doble envío:
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

- **Archivo:** `app/admin/capture/page.tsx`
  1. Importar `useQueryClient` de `@tanstack/react-query`:
     ```tsx
     import { useQuery, useQueryClient } from '@tanstack/react-query';
     ```
  2. Obtener `const queryClient = useQueryClient();` en `CapturePage`.
  3. En `onSaved` de `CaptureForm`:
     ```tsx
     onSaved={() => {
       setSelectedMatchId(null);
       if (seasonId) {
         queryClient.invalidateQueries({ queryKey: ['matches-programmed', seasonId] });
       }
     }}
     ```

---

### Tarea 2: Robustecer Inserciones de Partidos (`matches_vuelta_check`)
- **Archivo:** `app/admin/calendar/MissingMatchesModal.tsx`
  1. En la construcción de `faltantes` cuando `audit.total === 1` (líneas 218-233):
     ```tsx
     const existingMatch = audit.orderedMatches[0];
     const missingVuelta = existingMatch?.vuelta === 'vuelta' ? 'ida' : 'vuelta';
     const suggestedJornada = existingMatch?.jornada
       ? existingMatch.jornada + firstLegJornadaCount
       : nextSuggestedJornada;
     const missingHome = audit.homeByA === 0 ? audit.teamA : audit.teamB;
     const missingAway = missingHome.id === audit.teamA.id ? audit.teamB : audit.teamA;
     faltantes.push({
       key: `${audit.key}-${missingVuelta}`,
       home: missingHome,
       away: missingAway,
       pairLabel: audit.pairLabel,
       pairKey: audit.key,
       reason: 'Falta únicamente el juego espejo.',
       suggestedJornada,
     });
     ```
  2. En `attemptCreate` (línea 404):
     ```tsx
     vuelta: record.key.endsWith('-ida') ? 'ida' : 'vuelta',
     reserveMirror: record.key.endsWith('-ida'),
     ```
  3. En `createMissingMatch` (líneas 338-366), asegurar explícitamente `vuelta: 'ida'` para el partido inicial y `vuelta: 'vuelta'` para el espejo.
- **Archivo:** `scripts/simulateLiguilla.mjs`
  1. Agregar `vuelta: 'liguilla'` a todas las inserciones de partidos en el array `matchesToInsert`.

---

### Tarea 3: Soft-Delete Seguro en Equipos (FK 23503)
- **Archivo:** `app/admin/teams/page.tsx`
  1. Modificar la mutación `deleteTeam` (líneas 723-757) reemplazando el borrado en cascada destructivo por manejo no destructivo de FK:
     ```tsx
     const deleteTeam = useMutation({
       mutationFn: async (id: number) => {
         // Intentar borrado limpio si es un equipo recién creado sin historial
         const { error } = await supabase.from('teams').delete().eq('id', id);

         if (error) {
           if (error.code === '23503') {
             // Si tiene partidos o jugadores registrados, marcar como baja (soft-delete)
             const { error: updateError } = await supabase
               .from('teams')
               .update({ status: 'Baja' })
               .eq('id', id);
             if (updateError) throw updateError;

             // Desactivar también sus jugadores asociados
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
           message.info(
             'El equipo tiene historial registrado. Fue marcado como Baja para no afectar las estadísticas de la liga.',
             5
           );
         } else {
           message.success('Equipo eliminado permanentemente');
         }
       },
       onError: (error: Error) => message.error(error.message),
     });
     ```

---

### Tarea 4: Roster de Liguilla Completo con Indicador de Elegibilidad
- **Archivo:** `app/admin/capture/page.tsx`
  1. En la consulta de `homePlayers` (líneas 119-132):
     - **Eliminar** el filtro excluyente: `playersData = sortPlayersByNumber(playersData.filter(p => eligibleSet.has(p.id)));`.
     - Mantener todos los jugadores y ordenar por elegibilidad y luego número:
       ```tsx
       if (selectedMatch?.phase && selectedMatch.phase !== 'Fase Regular') {
         const { results } = await calcularElegibilidad(supabase, selectedMatch.home_team.id, seasonId!);
         eligibilityMap = new Map(
           results.map((result) => [
             result.jugador_id,
             { elegible: result.elegible, asistencias: result.asistencias, min: result.min_requerido },
           ])
         );
         // Mostrar todos los jugadores: elegibles primero, luego por número
         playersData = [...playersData].sort((a, b) => {
           const eligA = eligibilityMap.get(a.id)?.elegible ? 1 : 0;
           const eligB = eligibilityMap.get(b.id)?.elegible ? 1 : 0;
           if (eligA !== eligB) return eligB - eligA;
           return getPlayerNumberSortValue(a.number) - getPlayerNumberSortValue(b.number);
         });
       }
       ```
  2. En la consulta de `awayPlayers` (líneas 173-186):
     - Aplicar la misma lógica para el equipo visitante.
- **Archivo:** `app/components/PlayerAttendanceTable.tsx`
  1. En líneas 133-137, refinar el renderizado del Tag de elegibilidad para claridad visual:
     ```tsx
     {row.eligibility_label && (
       <Tag color={row.is_eligible ? 'blue' : 'orange'} style={{ marginInlineEnd: 0 }}>
         {row.is_eligible ? `Elegible (${row.eligibility_label})` : `No elegible (${row.eligibility_label})`}
       </Tag>
     )}
     ```

---

## 5. Verification Method

Para verificar independientemente que las soluciones cumplen con todos los criterios de aceptación y no generan regresiones:

1. **Pruebas Unitarias y E2E Existentes:**
   ```powershell
   npm test
   ```
   - Debe pasar el 100% de los 22 archivos de prueba (138 tests), en particular:
     - `tests/e2e/tier1-features.test.ts` (específicamente `T1-F9.5` de invalidación de caché TanStack Query y `T1-F1` de persistencia).
     - `tests/e2e/tier2-boundaries.test.ts` (específicamente `T2-B09` de `matches_vuelta_check` y `T2-B10` de soft-delete roster integrity).
     - `tests/eligibility.test.ts` (cálculo de umbral `floor(N/2) + 1`).

2. **Verificación de Tipos y Compilación de Producción:**
   ```powershell
   npm run lint
   npm run build
   ```
   - Ambos comandos deben terminar con código de salida `0` sin advertencias críticas de TypeScript.

3. **Verificación Manual en UI (Admin Preview):**
   - **Captura:** Navegar a `/admin/capture`, seleccionar un partido programado, capturar puntos y guardar.
     - *Condición de éxito:* El botón muestra spinner (`loading`) y no permite doble clic; al guardar aparece el toast de éxito y al volver a la lista el partido se refresca inmediatamente mostrando su nuevo estado sin recargar la página (`F5`).
   - **Elegibilidad Liguilla:** Seleccionar un partido con fase `Cuartos de Final` o `Semifinal`.
     - *Condición de éxito:* Se listan todos los jugadores activos del equipo; los no elegibles aparecen con tag naranja `No elegible (X/Y)` pero sus checkboxes de asistencia permanecen interactuables si la mesa los autoriza.
   - **Borrado de Equipo con Historial:** Intentar eliminar un equipo que ya disputó partidos.
     - *Condición de éxito:* No se eliminan partidos ni estadísticas; se despliega un mensaje informativo indicando que fue marcado como `Baja`, y su estado en la lista cambia a `Baja`.
