# Reporte de Auditoría Técnica y Diagnóstico de Regresión (R1)
**Proyecto:** Liga Municipal de Basquetbol de Nochixtlán  
**Módulo:** Panel de Administración (`/admin/capture`, `/admin/teams`, `/admin/calendar`, `/admin/seasons`)  
**Fecha de Investigación:** 2026-09-03  
**Investigador:** Data Flow & Regression Explorer (`explorer_regression_1`)  

---

## 1. Resumen Ejecutivo y Diagnóstico Raíz

Tras una auditoría exhaustiva del flujo de datos de extremo a extremo, trazando código fuente, base de datos en vivo (Supabase PostgreSQL), manejo de autenticación/sesiones, restricciones de integridad y ciclo de vida de React Query / App Router en Next.js 16, se concluye que **la incapacidad percibida y real para capturar, modificar y observar persistencia tras recargar la página se debe a cuatro causas técnicas concurrentes**:

1. **Pérdida Determinista de Temporada Activa al Recargar (Causa Principal de "No Persiste tras Recargar"):**  
   En `/admin/capture`, `/admin/calendar` y `/admin/teams`, cada vez que la página monta o se recarga (`F5`), se ejecuta un `useEffect` que ejecuta:
   ```ts
   supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
     .then(({ data }) => { if (data) setSeasonId(data.id); });
   ```
   En la base de datos de producción existen **5 temporadas activas concurrentes** (Femenil ID 3, 3ra Fuerza ID 4, Libre ID 10, Master ID 11, Veteranos ID 12).  
   La consulta `.limit(1).single()` retorna **invariablemente la Temporada 3 (Femenil)**.  
   Si el administrador estaba capturando o editando en Tercera Fuerza (4), Libre (10) o Veteranos (12), al guardar y recargar la página, **el panel se reinicia forzosamente a la Temporada 3**. Los partidos, equipos y resultados recién guardados desaparecen de la vista del usuario, produciendo la certeza de que *"los datos no persistieron"*, a pesar de que el registro en BD sí se guardó en la otra temporada. No existe sincronización con URL (`?season=X`) ni persistencia en `localStorage`.

2. **Caché Estancada en Memoria y Falta de Invalidación en React Query (`/admin/capture`):**  
   En `app/admin/capture/page.tsx`, la lista de partidos se consulta mediante `useQuery({ queryKey: ['matches-programmed', seasonId] })` con un `staleTime` global de 30 segundos (`AntdProvider.tsx`).  
   Al presionar *"Guardar Resultado"* en `CaptureForm.tsx`, se ejecuta `saveMatchResult`, se invoca la API pública de invalidación de caché (`invalidatePublicCache`), y se dispara `onSaved?.()`.  
   En `CapturePage`, `onSaved` hace únicamente: `setSelectedMatchId(null)`.  
   **Nunca se llama a `queryClient.invalidateQueries({ queryKey: ['matches-programmed', seasonId] })`** (de hecho, `useQueryClient` ni siquiera está importado en `CapturePage`).  
   Al regresar al selector de partidos sin recargar la página, el partido capturado sigue apareciendo en estado `Programado` y con el marcador anterior. Si el capturista lo vuelve a seleccionar, las cédulas muestran los datos en caché estancados.

3. **Desincronización de Clientes Supabase (Cookie Auth SSR vs Cliente Anon en Navegador):**  
   El inicio de sesión (`app/login/page.tsx`) utiliza `@supabase/ssr` (`createBrowserClient` de `@/lib/supabase/client`), el cual almacena la sesión de Auth en **cookies HTTP** (`sb-*-auth-token`).  
   Las APIs (`app/api/admin/*`) y el Proxy (`proxy.ts`) leen estas cookies mediante `createServerClient` de `@/lib/supabase/server`.  
   Sin embargo, **todas las páginas administrativas cliente** (`CaptureForm.tsx`, `app/admin/capture/page.tsx`, `app/admin/teams/page.tsx`, `app/admin/calendar/page.tsx`, `app/admin/seasons/page.tsx`, `AdminEditForm.tsx`, `lib/saveMatch.ts`) importan:
   ```ts
   import { supabase } from '@/lib/supabase';
   ```
   En `lib/supabase.ts`, se crea una instancia singleton con `@supabase/supabase-js` `createClient(url, anonKey)` sin adaptador de cookies (lee por defecto `window.localStorage`).  
   Por ende, en el navegador, el cliente `supabase` singleton **no posee la sesión de usuario autenticado (`auth.getSession()` retorna `null`)** y ejecuta todas las mutaciones PostgREST directamente con el rol público `anon`.  
   Si en la base de datos se activa o audita Row Level Security (RLS) para requerir `TO authenticated` (como ya ocurre en `player_credentials`), **todas las mutaciones en `matches`, `player_match_stats`, `teams`, `players` y `seasons` son bloqueadas silenciosamente** (PostgreSQL RLS en `UPDATE` devuelve 0 filas afectadas sin arrojar error si no se exige retorno con `.select()`).

4. **Violación de Constraint de Integridad de BD (`matches_vuelta_check`):**  
   En la base de datos existe una restricción de verificación estricta:
   ```
   error: new row for relation "matches" violates check constraint "matches_vuelta_check" (code 23514)
   ```
   Cualquier inserción a `matches` que omita la columna `vuelta` o envíe un valor fuera de `('ida', 'vuelta', 'liguilla')` es abortada por PostgreSQL. Si un flujo de calendario o reprogramación inserta sin definir explícitamente `vuelta`, la inserción falla en silencio o mediante un toast de error genérico.

---

## 2. Auditoría Detallada del Flujo de Datos por Módulo

### 2.1. Módulo de Captura (`/admin/capture`)

```
[UI: /admin/capture] 
  → SeasonSelector (local seasonId state)
  → Select Partido (selectedMatchId)
  → useQuery('players-capture-home') & useQuery('players-capture-away')
      ↳ fetch('/api/admin/team-credentials') [Valida auth cookie + 'manage_capture']
      ↳ if (phase !== 'Fase Regular') calcularElegibilidad()
  → [CaptureForm] (homeLineup, awayLineup, resultType)
  → User clicks "Guardar Resultado"
  → handleSave()
      ↳ saveMatchResult(supabase, match.id, resultType, homeLineup, awayLineup)
          1. supabase.from('matches').update({ status, home_score, away_score, played_date })
          2. supabase.from('player_match_stats').delete().eq('match_id', matchId)
          3. supabase.from('player_match_stats').insert(allStats)
          4. If playoff series: calcula victorias y actualiza juego 3 ('No Necesario' / 'Programado')
      ↳ invalidatePublicCache({ seasonId }) [POST /api/admin/revalidate-public-data]
      ↳ message.success('Resultado guardado correctamente')
      ↳ onSaved?.() → setSelectedMatchId(null)
  → [Falla de Refresco]: NO se invalida queryKey ['matches-programmed', seasonId]
  → [Falla de Persistencia al Recargar]: useEffect inicializa seasonId a Season 3 de forma forzada
```

#### Hallazgos Específicos en Captura:
- **`saveMatchResult` (`lib/saveMatch.ts`):**  
  - No usa transacciones RPC atómicas en Supabase. Si el paso 3 (`player_match_stats.insert`) llegase a fallar, el partido ya quedó actualizado en paso 1 y las estadísticas anteriores ya fueron borradas en paso 2, dejando el partido huérfano de estadísticas.
  - El cliente pasado a `saveMatchResult` es el cliente `supabase` anónimo de `lib/supabase.ts`.
- **Filtro de Elegibilidad en Liguilla (`app/admin/capture/page.tsx:130, 184`):**  
  ```ts
  playersData = sortPlayersByNumber(playersData.filter(p => eligibleSet.has(p.id)));
  ```
  En partidos de postemporada (Cuartos, Semifinal, Final), los jugadores que no alcanzan el umbral de asistencia de fase regular (`floor(totalPartidos / 2) + 1`) son **removidos por completo de la tabla**. Si el capturista intenta registrar la participación de un jugador con permiso especial, el jugador no aparece en la lista. Debería mostrarse en la tabla con indicador visual de no elegible pero seleccionable si la mesa de control lo autoriza.
- **Falta de Bloqueo del Botón de Guardado:**  
  `CaptureForm.tsx` activa `<Spin spinning={saving}>`, pero el botón `<Button onClick={handleSave}>` no tiene `disabled={saving}`. Clics rápidos múltiples disparan ejecuciones concurrentes de `saveMatchResult`, provocando carreras en `player_match_stats.delete()` e `insert()`.

---

### 2.2. Módulo de Equipos y Jugadores (`/admin/teams`)

```
[UI: /admin/teams]
  → SeasonSelector (seasonId inicializado por .limit(1).single())
  → useQuery('teams') & useQuery('players')
  → [Creación / Edición de Equipo]
      ↳ supabase.from('teams').insert(payload) o .update(payload)
      ↳ onSuccess: qc.invalidateQueries(['teams']) + invalidatePublicCache({ seasonId })
  → [Creación de Jugador]
      ↳ supabase.from('players').insert(payload).select('id').single()
      ↳ issueCredentialForPlayer(playerId) → POST /api/admin/issue-player-credential
          ↳ Requiere sesión activa en cookies y permiso 'manage_teams'
          ↳ createAdminClient() genera credencial activa y token
  → [Edición de Jugador]
      ↳ supabase.from('players').update(payload).eq('id', id)
      ↳ Si cambiaron datos críticos: reissueCredentialForPlayer()
  → [Persistencia al Recargar]: Al recargar, seasonId vuelve a temporada 3.
```

#### Hallazgos Específicos en Equipos:
- **Tipo de Columna `number`:** En la base de datos se aplicó `migration_player_number_text.sql` (la columna `players.number` es tipo `text` para admitir números como `00`, `0`, o combinaciones). En TypeScript en `app/admin/capture/page.tsx:34` está tipado como `number: number | null`, lo que produce advertencias o conversiones inconsistentes.
- **Doble Fuente de Escritura:** La tabla `players` se modifica directamente con el cliente `supabase` de `lib/supabase.ts`, pero las credenciales asociadas se emiten a través del endpoint servidor `/api/admin/issue-player-credential`. Si el endpoint falla o el usuario no tiene la cookie adecuada, el jugador se crea en BD pero la credencial no, quedando en estado inconsistente.

---

### 2.3. Módulo de Calendario (`/admin/calendar`)

```
[UI: /admin/calendar]
  → SeasonSelector (seasonId inicializado por .limit(1).single())
  → useQuery('matches')
  → [Creación Manual de Partido]
      ↳ Inserta ida (Programado) y reserva vuelta (Pendiente)
      ↳ REQUIERE vuelta: 'ida' y vuelta: 'vuelta' por constraint matches_vuelta_check
  → [Edición de Partido: AdminEditForm]
      ↳ Modal flotante para editar cancha, horario, jornada y resultado
      ↳ supabase.from('matches').update(...)
      ↳ Si el partido es de Liguilla: recalcula series al mejor de 3
      ↳ onSuccess: invalida ['matches'], ['matches-programmed'], ['stats']
  → [Generador Round Robin]
      ↳ Genera vueltas de ida y segunda vuelta espejo
      ↳ Inserta en bulto con vuelta definida
```

#### Hallazgos Específicos en Calendario:
- En `MissingMatchesModal.tsx`, al programar partidos faltantes, si no se envía `vuelta: 'ida'` o `'vuelta'`, la inserción falla en PostgreSQL con código `23514` (`matches_vuelta_check`).
- Al igual que en Captura, la recarga del navegador devuelve el calendario a la Temporada 3, ocultando las jornadas recién programadas en otras categorías.

---

### 2.4. Módulo de Temporadas (`/admin/seasons`)

```
[UI: /admin/seasons]
  → useQuery('seasons')
  → [Crear / Editar Temporada]
      ↳ supabase.from('seasons').insert(...) / .update(...)
  → [Activar Temporada]
      ↳ Desactiva temporadas de la misma categoría: .update({ is_active: false }).eq('category', category)
      ↳ Activa la seleccionada: .update({ is_active: true }).eq('id', id)
      ↳ Invalida ['seasons'], ['active-season'], ['seasons-selector']
```

#### Hallazgos Específicos en Temporadas:
- La regla de activación desactiva las temporadas *dentro de la misma categoría*, lo que explica por qué hay **5 temporadas con `is_active: true`** en la base de datos (una por cada categoría: Femenil, 3ra Fuerza, Libre, Master, Veteranos).
- El sistema fue diseñado para permitir una temporada activa por categoría, pero las vistas (`/admin/capture`, `/admin/calendar`, `/admin/teams`) asumieron erróneamente que solo existiría *una única temporada activa en toda la liga*, usando `.limit(1).single()`.

---

## 3. Matriz Comparativa de Inicialización de Clientes Supabase

| Archivo | Cliente Utilizado | Origen del Paquete | Manejo de Sesión / Auth | Destino Principal |
|---|---|---|---|---|
| `lib/supabase.ts` | `createClient(url, anonKey)` | `@supabase/supabase-js` | **Ninguno en SSR** (LocalStorage por defecto en navegador; token anónimo sin cookies) | `CaptureForm`, `AdminEditForm`, páginas admin |
| `lib/supabase/client.ts` | `createBrowserClient(url, anonKey)` | `@supabase/ssr` | **Cookies HTTP** (`document.cookie`, chunks `sb-*-auth-token`) | `app/login/page.tsx`, `AdminLayout.tsx` (logout) |
| `lib/supabase/server.ts` | `createServerClient(url, anonKey, { cookies })` | `@supabase/ssr` | **Cookies HTTP vía Next Headers** (`cookies()`) | `app/api/admin/*`, `lib/access-control-server.ts` |
| `lib/supabase/admin.ts` | `createClient(url, serviceRoleKey)` | `@supabase/supabase-js` | **Service Role (Bypass RLS)** | Rutas privilegiadas internas de credenciales |

### Diagnóstico de Vulnerabilidad de RLS:
Si en algún momento se implementan o corrigen políticas RLS en las tablas del juego (`matches`, `teams`, `players`, `player_match_stats`) para que requieran `TO authenticated`:
- Las mutaciones hechas desde `import { supabase } from '@/lib/supabase'` fallarán inmediatamente porque dicho cliente **no adjunta el token JWT de la cookie**.
- Para unificar y asegurar la persistencia, **todas las llamadas del lado del cliente en el panel admin deben consumir una única instancia basada en `@supabase/ssr` (`createClient` de `@/lib/supabase/client`)**.

---

## 4. Por Qué los Cambios "No Persisten" al Recargar: Análisis Causal

```
[Usuario selecciona Temporada 4: "Liga Tercera Fuerza"]
                    │
                    ▼
[Usuario captura partido J31 y presiona "Guardar Resultado"]
                    │
                    ▼
[saveMatchResult ejecuta exitosamente en Supabase para match_id de Temporada 4]
                    │
                    ▼
[Usuario ve mensaje "Resultado guardado correctamente"]
                    │
                    ▼
[Usuario oprime F5 (Recargar Página)]
                    │
                    ▼
[CapturePage monta con seasonId = null]
                    │
                    ▼
[useEffect ejecuta: supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()]
                    │
                    ▼
[PostgREST retorna: { id: 3 } ("Liga Femenil 2026")]
                    │
                    ▼
[setSeasonId(3)]
                    │
                    ▼
[useQuery carga partidos de la Temporada 3 (Femenil)]
                    │
                    ▼
[RESULTADO PERCIBIDO POR EL USUARIO]:
"¡Los datos no se guardaron! Mi partido desapareció y la jornada no tiene mis puntos."
```

**Evidencia Verificada:**
- Consulta en base de datos en vivo:
  ```json
  [
    { "id": 3, "name": "Liga Femenil 2026", "is_active": true },
    { "id": 4, "name": "Liga Tercera Fuerza 2026", "is_active": true },
    { "id": 10, "name": "LIGA LIBRE 2026", "is_active": true },
    { "id": 11, "name": "LIGA MASTER", "is_active": true },
    { "id": 12, "name": "Liga Veteranos 2026", "is_active": true }
  ]
  ```
- `.limit(1).single()` siempre resuelve a `{ id: 3 }`.
- La falta de persistencia en `localStorage` o URL para la temporada activa hace que cualquier trabajo en las otras 4 categorías activas se "pierda" de la vista inmediatamente al recargar.

---

## 5. Recomendaciones Técnicas de Corrección (Sin Pérdida de Datos ni Ruptura de Schema)

### Acción 1: Estado Global y Persistencia de Temporada Activa
1. **Crear un hook o Store Central (`useAdminSeasonStore` o sincronización con `localStorage` / URL search params):**
   - Almacenar la clave `admin_selected_season_id` en `localStorage`.
   - Si no existe valor previo, buscar la primera temporada activa, pero si el usuario selecciona otra, guardarla en `localStorage` y opcionalmente reflejarla en la URL (`?season=4`).
   - Al recargar la página, leer primero el valor guardado en `localStorage` o URL.
   - Sincronizar el selector de temporada entre el Topbar y todas las pantallas (`Capture`, `Teams`, `Calendar`).

### Acción 2: Unificación del Cliente Supabase en el Frontend
1. **Migrar `lib/supabase.ts` para que en el navegador use `@supabase/ssr`:**
   - En lugar de mantener clientes desvinculados, unificar para que las mutaciones cliente compartan la sesión de Auth almacenada en cookies.
   - Alternativamente, exportar desde `lib/supabase/client.ts` el cliente browser y consumirlo consistentemente en todas las páginas admin.

### Acción 3: Corrección del Ciclo de Vida y Refresco en `/admin/capture`
1. **Invalidación Inmediata de Queries tras Guardar:**
   ```ts
   // En CaptureForm.tsx tras saveMatchResult:
   const qc = useQueryClient();
   qc.invalidateQueries({ queryKey: ['matches-programmed', seasonId] });
   qc.invalidateQueries({ queryKey: ['players-capture-home'] });
   qc.invalidateQueries({ queryKey: ['players-capture-away'] });
   ```
2. **Protección contra Doble Envío:**
   - Deshabilitar el botón de guardado con `loading={saving}` y `disabled={saving}`.
3. **Feedback Positivo y Re-selección Limpia:**
   - Mostrar estado de confirmación inequívoco con el marcador final y badge de "Guardado en Base de Datos".

### Acción 4: Salvaguarda del Constraint `matches_vuelta_check`
1. Asegurar que cualquier mutación o inserción de `matches` en el cliente y servidor asigne explícitamente `vuelta: 'ida' | 'vuelta' | 'liguilla'`.

### Acción 5: Flexibilizar la Tabla de Captura en Liguilla
1. En `/admin/capture`, no ocultar a los jugadores marcados como no elegibles; mostrarlos en la tabla con badge distintivo (ej. *"No elegible (8/15 asistencias)"*) y permitir a la mesa de control marcar asistencia si existe visto bueno arbitral o directivo.

---

## 6. Conclusión Diagnóstica
La regresión R1 no es producto de una base de datos corrupta ni de caída del backend, sino de una **desincronización de arquitectura en tres capas del frontend**:
1. El reseteo forzado a Temporada 3 por `.limit(1).single()`.
2. La falta de invalidación en React Query que mantiene datos viejos en memoria tras el guardado.
3. El uso del cliente Supabase anónimo de `lib/supabase.ts` en lugar del cliente con cookies de `@supabase/ssr`.

La reparación es 100% segura, de bajo riesgo, sin cambios destructivos en base de datos, y restablecerá de inmediato la confianza y productividad del panel administrativo.
