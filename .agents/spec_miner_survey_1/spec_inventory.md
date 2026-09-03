# INVENTARIO EXHAUSTIVO DE ESPECIFICACIONES — PANEL ADMIN LIGA NOCHIXTLÁN
**Documento:** `spec_inventory.md`  
**Autor:** Admin Spec Miner (`spec_miner_survey_1`)  
**Fecha:** 2026-09-03  
**Fuentes de Verdad:** `MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md`, `.agents/ORIGINAL_REQUEST.md`, Código fuente (`app/admin/*`, `lib/*`, `app/components/*`), Suite de pruebas Vitest (`tests/*`).

---

## 1. RESUMEN EJECUTIVO Y OBJETIVOS PRIMARIOS

El proyecto consiste en una transformación crítica en dos etapas del Panel de Administración de la Liga Municipal de Basquetbol de Nochixtlán:
1. **ETAPA A — REPARAR:** Identificar la causa raíz y solucionar cualquier regresión que impida modificar o capturar información en `/admin/capture`, `/admin/teams`, `/admin/calendar` y `/admin/seasons`. Garantizar persistencia comprobable en base de datos tras recargar la página (`F5`).
2. **ETAPA B — REDISEÑAR:** Rediseñar la experiencia del usuario hacia una interfaz de máxima productividad, moderna, compacta, orientada a teclado y optimizada para resoluciones de laptop (**1366×768** / 1920×1080) y teléfonos móviles (**390px** y **430px**).

**Regla de Oro:** *Primero recuperar la escritura. Después optimizar la captura. Nunca sacrificar datos, reglas de negocio o seguridad por diseño.*

---

## 2. REQUISITOS FUNCIONALES (R1, R2, R3)

### R1. Diagnóstico y Reparación de Regresión de Escritura y Captura
- **Auditoría de Flujo Completo:** Mapear y auditar la cadena:
  $$\text{UI} \rightarrow \text{Formulario / Estado Local} \rightarrow \text{Handlers de Evento} \rightarrow \text{API / Supabase Client} \rightarrow \text{PostgreSQL DB} \rightarrow \text{Respuesta} \rightarrow \text{Invalidación de Caché / Refresh}$$
- **Módulos bajo Auditoría Obligatoria:**
  - **`/admin/capture` (Captura de Resultados):**
    - Selección de temporada activa.
    - Selección de jornada y partido.
    - Carga de alineación local y visitante desde `players` y `player_match_stats`.
    - Modificación de asistencia (`played`), puntos individuales (`points`) y triples (`triples`).
    - Selección de tipo de resultado (`Normal`, `WO Local`, `WO Visitante`, `WO Doble`).
    - Invocación de `saveMatchResult` (`lib/saveMatch.ts`) persistiendo `matches` y `player_match_stats`.
    - Invalidación de caché pública (`invalidatePublicCache`).
    - Persistencia verificable tras recarga.
  - **`/admin/teams` (Equipos y Cédulas):**
    - Creación y edición de equipos (campos: nombre, categoría, capitán, teléfono, estatus, permisos usados 0-3, W.O. acumulados, notas de horario).
    - Inscripción y edición de jugadores (nombre, dorsal, CURP para veteranos, foto optimizada en Cloudinary, emisión y reemisión de credencial digital).
    - Baja lógica / reactivación de jugadores.
    - Eliminación protegida: si el jugador tiene historial de estadísticas, soft-delete (`is_active = false`) para evitar violación de FK (`23503`) y proteger historial; si no tiene estadísticas, eliminación permanente y limpieza de asset en Cloudinary.
  - **`/admin/calendar` (Programación y Calendario):**
    - Creación manual de partidos con validación de conflictos (`checkSchedulingConflicts`).
    - Edición de partidos vía `AdminEditForm` (jornada, fecha, hora, cancha, equipos).
    - Asistente de programación de jornada y guardado en lote.
    - Generación automática de rol de dos vueltas (ida y vuelta).
    - Generación y avance de series de Liguilla (cuartos, semis, final, tercer lugar) y cancelación automática del 3er juego no necesario (`No Necesario` / `Programado`).
  - **`/admin/seasons` (Temporadas):**
    - Creación y edición de temporadas (nombre, categoría, año, `is_test`).
    - Activación de temporada: al activar una temporada en una categoría, desactivar automáticamente cualquier otra temporada activa en la misma categoría.
    - Validación de prerrequisitos (`lib/validators.ts`): existencia de temporada activa y al menos 2 equipos activos para calendarización, captura y playoffs.
  - **`/admin/eligibility` (Elegibilidad de Liguilla):**
    - Cálculo dinámico de elegibilidad: $\text{mínimo requerido} = \lfloor \frac{\text{total partidos equipo}}{2} \rfloor + 1$.
    - Filtrado de jugadores inelegibles en fases de postemporada.
  - **`/admin/access` (Control de Roles y Permisos):**
    - Verificación de los 4 roles RBAC: `super_admin`, `registro_equipos`, `programacion`, `captura_resultados`.

### R2. Rediseño UX/UI para Máxima Productividad
1. **App Shell & Navegación:**
   - Sidebar lateral única sin duplicidades con la barra superior.
   - Topbar contextual:
     - Indicador permanente de temporada activa (ej. `Temporada Activa: Liga Tercera Fuerza 2026 · 3ra`).
     - Breadcrumbs contextuales no redundantes (ej. `Admin / Equipos / Muebles Carlitos / Jugadores`).
     - Identificador de usuario, rol actual (`useAdminAccess`) y botón de cerrar sesión.
   - Eliminación del contenedor fijo angosto de 960px (`maxWidth: 960`) que genera enormes vacíos laterales en pantallas de escritorio.
2. **Dashboard Operativo (/admin):**
   - Transformación de un menú estático de tarjetas a un centro de mando operativo.
   - Resumen del estado de la temporada activa.
   - Métricas clave: equipos activos, partidos jugados, partidos pendientes por capturar, credenciales pendientes.
   - Alertas directas de partidos pendientes de captura de la jornada más reciente.
   - Accesos directos rápidos: `+ Nueva Temporada`, `+ Nuevo Equipo`, `+ Nuevo Partido`, `✍️ Capturar Resultado`, `📋 Revisar Elegibilidad`.
3. **Equipos y Jugadores (/admin/teams):**
   - Ordenamiento alfabético A–Z por defecto en el listado de equipos.
   - Buscador instantáneo prominente (`Buscar equipo...`) con respuesta en tiempo real, case-insensitive y tolerante a acentos.
   - Barra de filtro alfabético (`Todos | A B C D ... Z`).
   - Filtros agrupados: Categoría, Estatus, Credenciales pendientes.
   - Botón obligatorio "Limpiar filtros".
   - Feedback de conteo dinámico: `X de Y equipos`.
   - Jerarquía clara de acciones por fila: acción principal visible (`Ver equipo` / `Cédula`), menú secundario estructurado, eliminación destructiva aislada.
   - Buscador y ordenamiento A–Z también dentro del modal de jugadores por equipo.
4. **Calendario Optimizado (/admin/calendar):**
   - Agrupación ordenada de filtros: Equipo, Vuelta (Ida/Vuelta/Liguilla), Estado, Cancha, Jornada.
   - Botón "Limpiar filtros" y feedback `X de Y partidos`.
   - Jerarquía visual de botones de acción:
     - Primaria destacada: `+ Nuevo Partido`.
     - Secundarias: `Partidos Faltantes`, `Asistente de Jornada`, `WhatsApp`, `Rol Básico`, `Arrancar Liguilla`.
   - Mantenimiento del bloque analítico de progreso de temporada regular y balance de canchas por equipo.
5. **Captura V2 (Flujo Guiado) (/admin/capture):**
   - Flujo visual secuencial claro:
     1. Temporada (precargada automáticamente de la temporada activa).
     2. Jornada (selector numérico compacto, jornada actual sugerida).
     3. Partido (buscador y selector enriquecido: partidos pendientes al inicio, jugados al final).
     4. Contexto sticky: `Jornada X | Local vs Visitante | Cancha · Horario | Estatus`.
     5. Cédulas de pase de lista y captura: tablas separadas de ancho completo para local y visitante, con columnas fijas (`photo`, `#`, `Jugador`).
     6. Marcador en vivo reactivo con diferenciación de ganador/perdedor y alertas de W.O.
     7. Botón de guardado unívoco (`Guardar Resultado`).
   - Navegación optimizada para teclado: `Tab`, `Shift+Tab`, autofocus en primer campo editable relevante, checkboxes accionables con barra espaciadora, inputs numéricos directos.
   - Prevención estricta contra doble envío: estado `isSubmitting`/`saving`, botón deshabilitado con spinner, bloqueo de inputs durante el guardado.
   - Manejo de estados: loading discreto, éxito inequívoco con opciones (`Volver a lista`, `Siguiente partido`), error descriptivo preservando los datos ingresados en memoria.
   - Detección de cambios sin guardar (dirty state) al intentar cambiar de partido o abandonar la página.
6. **Diseño Visual & Responsive:**
   - Tema *Dark Premium / Funcional*: fondos `#141414`, `#1f1f1f`, `#262626`, acentos ámbar/dorado `#FAAD14` / `#f7d774`, estados verde éxito `#52c41a`, rojo error `#ff4d4f`.
   - Optimización estricta para **1366×768**: tablas densas, espaciados ajustados, sticky headers, aprovechamiento del ancho completo de pantalla.
   - Adaptación responsive real para **390px** y **430px**: sidebar convertible a Drawer accesible, tablas con scroll horizontal controlado o modo tarjeta, filtros en panel colapsable, botones de toque cómodo (mínimo 44px de altura).

### R3. Restricciones de Seguridad, Integridad y Cero Pérdida de Datos
- **CERO pérdida de datos:** Prohibido resetear BD, truncar tablas, ejecutar migraciones destructivas o correr scripts de seed destructivos.
- **Protección de Secretos:** Prohibido alterar variables de entorno o credenciales en `.env.local`.
- **Integridad de Página Pública:** Prohibido alterar componentes o estilos de la página pública aprobada (`/`, `app/page.tsx`, `PublicPageClient.tsx`, etc.).
- **Control de Versiones Seguro:** Prohibido usar `git push --force`, `git reset --hard`, `git clean -fd`, deploy a producción o merge a main sin autorización explícita.
- **Seguridad RBAC:** Mantener la matriz de autorización intacta salvo corrección de un bug técnico comprobado.

---

## 3. ESPECIFICACIÓN DETALLADA DE FLUJOS DE DATOS Y REGLAS DE NEGOCIO

### 3.1. Reglas Deportivas y Puntos de Tabla (`lib/liga.ts`)
| Resultado del Partido | Puntos Tabla Local | Puntos Tabla Visitante | Marcador Asignado |
|---|---|---|---|
| Victoria Normal Local | 3 | 1 | Marcador real jugado |
| Victoria Normal Visitante | 1 | 3 | Marcador real jugado |
| W.O. Local (no se presenta local) | 0 | 3 | Marcador capturado (generalmente default a favor de visita) |
| W.O. Visitante (no se presenta visita) | 3 | 0 | Marcador capturado (generalmente default a favor de local) |
| Doble W.O. (ambos faltan) | 0 | 0 | Marcador capturado |

### 3.2. Criterios de Desempate en Clasificación (`lib/standings.ts`)
1. Puntos de tabla acumulados.
2. Diferencia de puntos de juego ($\text{Puntos Anotados} - \text{Puntos Recibidos}$).
3. Mayor cantidad de puntos anotados (GF).
4. Enfrentamiento directo entre equipos empatados (si aplica en pares).

### 3.3. Captura y Estadísticas Individuales (`lib/saveMatch.ts`)
- **Cálculo de Marcador del Partido:**
  $$\text{Score} = \sum_{\text{jugador} \in \text{alineación}} (\text{jugador.played} ? \text{jugador.points} : 0)$$
- **Persistencia en Base de Datos:**
  1. `UPDATE matches SET status = statusMap[resultType], home_score = homeScore, away_score = awayScore, played_date = now() WHERE id = matchId;`
  2. `DELETE FROM player_match_stats WHERE match_id = matchId;`
  3. `INSERT INTO player_match_stats (match_id, player_id, team_id, played, points, triples) VALUES (...)` (únicamente para jugadores con `played === true`).
  4. Lógica de Liguilla automatizada: Si `phase !== 'Fase Regular'`, se evalúa la serie a ganar 2 de 3. Si un equipo acumula 2 victorias, el juego 3 programado se actualiza a `status = 'No Necesario'`. Si se revierte el resultado, se restaura a `'Programado'`.
  5. Invalidación de caché pública (`invalidatePublicCache({ seasonId })`).

### 3.4. Regla de Elegibilidad para Postemporada (`lib/eligibility.ts`)
- Partidos jugados válidos del equipo: Partidos en estatus `'Jugado'`, `'WO Local'`, `'WO Visitante'`, `'WO Doble'`.
- Umbral de asistencias requeridas:
  $$\text{minRequerido} = \left\lfloor \frac{\text{totalPartidos}}{2} \right\rfloor + 1$$
- Un jugador activo es elegible si y sólo si:
  $$\text{totalPartidos} > 0 \quad \land \quad \text{asistenciasJugador} \ge \text{minRequerido}$$
- En postemporada, `/admin/capture` filtra la alineación para incluir exclusivamente jugadores elegibles, mostrando el tag `${asistencias}/${minRequerido}`.

### 3.5. Ciclo de Vida de Credenciales Digitales
- Estados posibles: `active` (Vigente), `revoked` (Revocada / Baja), `pending` (Sin validar).
- Disparadores de reemisión automática: Cambio en nombre, dorsal o foto de un jugador con credencial previa.
- Disparador de revocación: Marcado de jugador como inactivo (`is_active = false`).
- Generación de PDF por equipo: 9 credenciales por hoja con código QR único `/verificar/[verify_token]`.

---

## 4. MATRIZ DE COMPONENTES Y ESPECIFICACIONES DE INTERFAZ (UI/UX)

### 4.1. App Shell y Layout (`app/components/AdminLayout.tsx`)
| Elemento | Comportamiento en Desktop (≥ 768px) | Comportamiento en Móvil (< 768px, 390px, 430px) |
|---|---|---|
| **Sidebar** | Fija lateral compacta (~220px), fondo `#0d0d0d`, iconos de módulo, rol de usuario, link a inicio. | Oculta; accesible mediante botón hamburguesa que despliega Drawer lateral. |
| **Topbar** | Fija superior (~50px), contexto de temporada activa siempre visible, breadcrumb dinámico, perfil y logout. | Compacta con selector de temporada o badge visible, botón de menú y logout rápido. |
| **Contenedor Content** | Ancho fluido al 100% con padding `16px 24px`, eliminando el límite `maxWidth: 960px`. | Ancho 100%, padding `12px 8px`, scroll vertical fluido. |

### 4.2. Módulo de Equipos y Jugadores (`app/admin/teams/page.tsx`)
- **Barra de Búsqueda:** `<Input.Search placeholder="Buscar equipo por nombre..." allowClear />` con filtrado en tiempo real sobre el dataset cargado.
- **Filtro Alfabético:** Fila de botones compactos `Todos`, `A`, `B`, ..., `Z` que filtran por la inicial del nombre del equipo.
- **Selectores de Filtro:**
  - Categoría (`Libre`, `Veteranos`, `Femenil`, `3ra`, `Master`).
  - Estatus (`Activo`, `Dado de Baja`).
  - Filtro booleano: `Credenciales pendientes`.
- **Botón "Limpiar filtros":** Restaura búsqueda y filtros a valores por defecto (`Todos`), habilitado sólo cuando hay filtros aplicados.
- **Contador Dinámico:** Texto prominente `Mostrando X de Y equipos`.
- **Acciones por Fila:**
  - Botón primario: `Ver Cédula` (o `+ Jugador`).
  - Botón secundario: `Editar`.
  - Menú `⋯`: `Eliminar` (con advertencia de cascada en modal rojo).

### 4.3. Módulo de Calendario (`app/admin/calendar/page.tsx`)
- **Barra de Filtros Agrupada:**
  - Equipo (Multi-select con búsqueda).
  - Vuelta (`Todas`, `Ida`, `Vuelta`, `Liguilla`).
  - Estado del Calendario (`Todos`, `Jugado`, `Pendiente sin fecha`, `Programado sin resultado`).
  - Cancha (`Todas`, canchas oficiales).
  - Jornada (`Todas`, Jornada 1..N).
  - Botón `Limpiar filtros` y contador `Mostrando X de Y partidos`.
- **Jerarquía de Botones de Cabecera:**
  - Botón Primario: `+ Nuevo Partido` (Botón principal con estilo primary ant).
  - Botones Secundarios: `Partidos Faltantes`, `Asistente de Jornada`, `WhatsApp`, `Rol Básico`, `Arrancar Liguilla`.

### 4.4. Módulo de Captura V2 (`app/admin/capture/page.tsx` y `CaptureForm.tsx`)
- **Cabecera de Selección:**
  - Selector de Temporada (precargado con la activa).
  - Selector de Jornada (resalta la jornada en curso).
  - Selector de Partido: Selector enriquecido con soporte de búsqueda. Muestra partidos en dos secciones lógicas:
    1. 🔴 **Pendientes de Captura** (primero en la lista).
    2. 🟢 **Finalizados / Jugados** (al final).
- **Banner Sticky de Contexto:**
  - Al seleccionar partido, tarjeta superior fija que no se pierde al hacer scroll:
    `Jornada X | LOCAL vs VISITANTE | Cancha · Horario | [Tag Estatus]`
- **Selector de Tipo de Resultado:**
  - Radio buttons: `Normal`, `W.O. Local`, `W.O. Visitante`, `Doble W.O.`
  - Alertas informativas automáticas para W.O. indicando quién gana y cómo se calculan puntos.
- **Marcador en Vivo (Scoreboard):**
  - Dos bloques visuales grandes con marcador acumulado en tiempo real.
  - Indicadores automáticos verde (gana) / rojo (pierde) / gris (empate).
- **Tablas de Alineación Local y Visitante:**
  - En desktop: Secciones apiladas de ancho completo con scroll horizontal suave si es necesario.
  - Columnas fijas a la izquierda: Foto (avatar 42px), Número de dorsal (`#`), Nombre del jugador y tags de credencial/elegibilidad.
  - Columna `✓` (asistencia): Checkbox grande centrado.
  - Columnas `Puntos` y `3PT`: `InputNumber` con ancho suficiente (80-90px), deshabilitados si el jugador no tiene asistencia marcada.
  - Botones rápidos: `Todos presentes` y `Limpiar asistencia`.
- **Ergonomía de Teclado:**
  - Al abrir el formulario, el foco se coloca automáticamente en el primer input editable.
  - `Tab` navega secuencialmente: `Check Asistencia Jugador 1` $\rightarrow$ `Puntos Jugador 1` $\rightarrow$ `3PT Jugador 1` $\rightarrow$ `Check Asistencia Jugador 2`...
  - `Shift+Tab` retrocede de forma simétrica.
  - Tecla `Enter` dentro de un input numérico no envía el formulario por error.
- **Botón de Guardado y Protección Doble Envío:**
  - Botón: `💾 Guardar Resultado`.
  - Al hacer click:
    - Se activa bandera `saving = true`.
    - Botón entra en estado `loading` con spinner.
    - Todos los controles del formulario quedan deshabilitados temporalmente.
    - Mensaje de confirmación: `✓ Resultado guardado correctamente`.
    - Si falla: `message.error(error.message)`, reactivación del formulario, preservación intacta de las cantidades capturadas.

---

## 5. TABLA DE CARACTERÍSTICAS DESCUBIERTAS (FEATURES DISCOVERED)

| # | Categoría | Característica | Descripción | Entradas (Inputs) | Salidas (Outputs) | Comportamiento ante Errores | Descubierto Vía |
|---|---|---|---|---|---|---|---|
| 1 | Captura | `saveMatchResult` | Guarda el resultado de un partido, actualiza marcador y persiste estadísticas individuales. | `supabase`, `matchId`, `resultType`, `homeLineup`, `awayLineup` | `Promise<void>` | Lanza excepción con mensaje específico de BD si falla actualización de match o inserción de stats. | `lib/saveMatch.ts` |
| 2 | Captura | Autocancelación Liguilla | En partidos de postemporada al mejor de 3, detecta si un equipo llegó a 2 victorias y marca el juego 3 como 'No Necesario'. | `matchId`, `phase !== 'Fase Regular'`, historial de la serie | Actualiza `status` a `'No Necesario'` o revierte a `'Programado'` | Captura y registra error silenciosamente en fetch sin romper guardado principal. | `lib/saveMatch.ts` |
| 3 | Captura | Control de Asistencia | Checkbox por jugador que habilita o deshabilita los inputs numéricos de puntos y triples. | `row.played` (boolean) | Actualiza estado local de alineación | Si `played === false`, puntos y triples se envían en 0 o no se insertan en `player_match_stats`. | `PlayerAttendanceTable.tsx` |
| 4 | Captura | Verificación Rápida de Credencial | Botón "Abrir" por jugador que abre en nueva pestaña la página pública `/verificar/[token]`. | `player.verify_token` | Abre ventana externa con cédula digital validada | Deshabilitado si el jugador no tiene token emitido. | `PlayerAttendanceTable.tsx` |
| 5 | Validación | Prerrequisitos de Módulo | Verifica existencia de temporada activa y mínimo 2 equipos activos antes de operar. | `step: 'teams' \| 'calendar' \| 'capture' \| 'playoff'` | `{ ok: boolean, message?: string }` | Retorna `ok: false` con mensaje en español para alertar en UI. | `lib/validators.ts` |
| 6 | Clasificación | Regla 3-1-0 Puntos Liga | Asigna puntos de tabla deportiva: 3 por victoria o WO ganado, 1 por derrota en cancha, 0 por WO perdido o doble WO. | `home_score`, `away_score`, `status` | `{ homePts, awayPts }` | Maneja marcadores nulos retornando 0 puntos. | `lib/liga.ts` |
| 7 | Clasificación | Desempate Olímpico | Ordena la tabla por puntos, diferencia de goleo, puntos a favor y duelos directos. | Lista de partidos y equipos de la temporada | Arreglo de posiciones ordenado | Soporta empates triples y múltiples casos borde. | `lib/standings.ts` |
| 8 | Elegibilidad | Fórmula de Liguilla | Calcula si un jugador cumple el mínimo requerido de asistencias para participar en playoffs. | `team_id`, `season_id`, historial de asistencias | `{ results, totalPartidos, minRequerido }` | Si `totalPartidos === 0`, ningún jugador es elegible. | `lib/eligibility.ts` |
| 9 | Seguridad / RBAC | Control de Acceso por Módulo | Define roles (`super_admin`, `registro_equipos`, `programacion`, `captura_resultados`) y filtra módulos visibles. | Correo de usuario / Rol de sesión | Permisos booleanos y lista de rutas accesibles | Redirección inmediata a `/no-access` si no tiene permisos. | `lib/access-control.ts` |
| 10 | Equipos | Soft-Delete de Jugadores | Al intentar eliminar un jugador con historial de estadísticas (código FK `23503`), lo marca como inactivo (`is_active = false`) en lugar de fallar. | `player.id` | Estatus `'soft-deleted'` y alerta informativa al admin | Si el error no es FK, lanza error estándar. | `app/admin/teams/page.tsx` |
| 11 | Equipos | Firma Cloudinary y Optimización | Optimiza la foto en el navegador (canvas/blob) y obtiene firma criptográfica segura desde el backend para subir a Cloudinary. | `file: File`, `playerName`, `teamId`, `seasonId` | URL segura, thumbnail generado y `public_id` | Muestra mensaje toast descriptivo si Cloudinary rechaza la imagen. | `app/admin/teams/page.tsx` |
| 12 | Equipos | Límite de Jugadores Activos | Impide registrar más de 99 jugadores activos en un mismo equipo. | Conteo de `players.is_active` en el equipo | Permite o bloquea inserción | Lanza `Error('Límite excedido: El equipo ya tiene 99 jugadores activos.')`. | `app/admin/teams/page.tsx` |
| 13 | Equipos | Emisión Masiva de Credenciales | Emite credenciales digitales QR en lote para todos los jugadores activos sin credencial en la temporada. | `seasonId`, opcional `teamId` | Conteo de credenciales emitidas y omitidas | Notifica si hubo fallos de red y reporta jugadores no elegibles. | `app/admin/teams/page.tsx` |
| 14 | Equipos | Generación de PDF Cédula | Genera documento PDF listo para imprimir con plantillas de 9 credenciales por hoja con QR vectorial. | `credentials: PlayerCredential[]`, `teamName` | Descarga de archivo `.pdf` | Muestra toast de error si falta la imagen base o datos del equipo. | `lib/credential-pdf.ts` |
| 15 | Calendario | Auditoría de Conflictos | Valida que un equipo no juegue dos veces en el mismo horario o en fechas con menor descanso que su frecuencia mínima. | `matches`, `teams`, `scheduledDate`, `timeStr`, `court` | `{ blocking: string[], warnings: string[] }` | Bloquea guardado si `blocking.length > 0`; advierte si hay advertencias no forzadas. | `lib/scheduling.ts` |
| 16 | Calendario | Asistente de Jornada | Algoritmo inteligente que sugiere fecha, cancha y horario balanceado para partidos pendientes de programar. | `assistantJornada`, `assistantDate`, `assistantCourts`, `assistantTimes` | Lista de sugerencias aceptables con balance de sedes | Informa si no hay partidos pendientes en la temporada actual. | `app/admin/calendar/page.tsx` |
| 17 | Calendario | Generador de WhatsApp | Genera texto estructurado con emojis listo para copiar y pegar en grupos de capitanes con la programación de la jornada. | `jornada`, lista de partidos filtrados | Modal con texto formateado y botón de copiado rápido al portapapeles | Muestra estado vacío si la jornada no tiene partidos programados. | `app/admin/calendar/page.tsx` |
| 18 | Calendario | Detección de Faltantes y Espejos | Analiza la matriz completa todos contra todos para encontrar cruces faltantes de ida y vuelta o duplicidades de localía. | Lista de equipos activos y partidos registrados | Modal con resumen de partidos faltantes y conflictos | Genera reporte visual con filtros por equipo. | `MissingMatchesModal.tsx` |
| 19 | Temporadas | Activación Exclusiva por Categoría | Al activar una temporada, desactiva automáticamente las demás temporadas de esa misma categoría. | `season.id`, `season.category` | Actualiza `is_active = true` para la seleccionada y `false` para las hermanas | Reversión y mensaje de error en toast si falla Supabase. | `app/admin/seasons/page.tsx` |
| 20 | Caché | Invalidación Selectiva de Caché Pública | Notifica a los endpoints públicos para purgar tags de Next.js (`revalidateTag`) tras cualquier escritura en el panel admin. | `{ seasonId, seasons?: boolean }` | Purga de caché en servidor público | Fallo silencioso con log para no interrumpir el flujo administrativo si el servidor de revalidación está ocupado. | `lib/public-cache-client.ts` |

---

## 6. TABLA DE CASOS BORDE (EDGE CASES)

| # | Característica | Entrada / Escenario | Comportamiento Observado / Esperado |
|---|---|---|---|
| 1 | Captura V2 | Partido en estatus `WO Local` o `WO Visitante` | El equipo infractor recibe 0 puntos en la tabla. El marcador capturado se guarda tal cual. En la UI se muestran alertas de color ámbar/rojo con tags explicativos. |
| 2 | Captura V2 | Doble W.O. (`WO_Doble`) | Ambos equipos reciben 0 puntos de tabla. Se permite capturar puntos individuales y asistencias de los jugadores que sí se presentaron. |
| 3 | Captura V2 | Intento de guardar sin jugadores con asistencia marcada | La suma acumulada es 0-0. El sistema debe permitir guardar o alertar explícitamente si el resultado es Normal pero no hay puntos capturados. |
| 4 | Captura V2 | Doble click accidental o envío repetido en `Guardar` | La protección `saving = true` deshabilita el botón inmediatamente y muestra un spinner, ignorando llamadas subsecuentes hasta completar la petición. |
| 5 | Captura V2 | Falla de conexión a internet durante el guardado en Supabase | Se dispara el bloque `catch`, se muestra `message.error` con el detalle del fallo, `saving` regresa a `false`, y los datos tecleados por el usuario permanecen en pantalla sin borrarse. |
| 6 | Captura V2 | Jugador sin dorsal registrado (`number === null`) | La función `formatPlayerNumber` muestra `'--'` o `'?'`, y en el ordenamiento se coloca al final (`Infinity`) para no romper la navegación. |
| 7 | Captura V2 | Partido de Liguilla con jugadores activos pero no elegibles | Los jugadores que no alcanzaron $\lfloor \frac{\text{partidos}}{2} \rfloor + 1$ asistencias quedan excluidos o bloqueados en la alineación elegible para postemporada. |
| 8 | Equipos | Intentar eliminar un jugador que ya jugó partidos y tiene estadísticas en `player_match_stats` | Error de integridad referencial de Postgres (`code: '23503'`). El handler intercepta el código y realiza automáticamente un soft-delete (`is_active = false`), revocando su credencial y mostrando un mensaje informativo al usuario. |
| 9 | Equipos | Jugador con CURP duplicada en categoría Veteranos | Postgres rechaza con violación de índice único `idx_players_curp_unique`. La UI atrapa el error y muestra `'Esta CURP ya está registrada para otro jugador.'`. |
| 10 | Equipos | Subida de foto que excede 8 MB o formato no imagen | La validación del cliente en `handlePhotoSelected` rechaza el archivo inmediatamente antes de consumir ancho de banda o procesar en canvas. |
| 11 | Equipos | Cambio de foto de jugador existente | La nueva foto se sube y el `public_id` anterior de Cloudinary se elimina mediante `/api/admin/cloudinary-remove` para evitar acumulación de basura en almacenamiento. |
| 12 | Equipos | Filtros combinados no producen resultados (búsqueda sin coincidencias) | La tabla muestra el estado vacío: *"No se encontraron equipos con estos filtros"* junto con el botón visible `[Limpiar filtros]`. |
| 13 | Calendario | Intento de programar un equipo contra sí mismo (`home_team_id === away_team_id`) | Se bloquea en la mutación con el error explícito: `'El equipo local y visitante deben ser diferentes.'`. |
| 14 | Calendario | Intento de programar un tercer partido regular entre dos equipos | La validación detecta que ya existen ida y vuelta registrados y lanza error bloqueante: `'No se puede crear otro partido entre X y Y: ya existen ida y vuelta registrados.'`. |
| 15 | Calendario | Conflicto de cancha y horario entre dos partidos | `checkSchedulingConflicts` detecta traslape exacto de cancha, fecha y hora y genera un mensaje bloqueante impidiendo la inserción. |
| 16 | Temporadas | Intentar entrar a Calendario o Captura sin temporada activa creada | `checkPrerequisites` detecta ausencia de temporada activa y devuelve: `'No hay temporada activa. Crea y activa una temporada primero.'`. |
| 17 | Acceso / RBAC | Usuario con rol `captura_resultados` intentando acceder a `/admin/seasons` | `canAccessPath` devuelve `false`. El middleware o layout redirige al usuario o no muestra el enlace en la navegación. |
| 18 | App Shell | Pantalla pequeña móvil de 390px de ancho | El menú lateral se oculta completamente en un Drawer, la barra superior no desborda, y las tablas de datos permiten desplazamiento horizontal fluido sin romper la ventana gráfica. |

---

## 7. CRITERIOS DE ACEPTACIÓN Y PLAN DE VERIFICACIÓN

### 7.1. Criterios de Aceptación Técnicos
1. **Compilación y Build:**
   - `npm run build` debe completar exitosamente con código de salida 0, sin errores de TypeScript ni errores de empaquetado de App Router.
2. **Linting y Calidad de Código:**
   - `npm run lint` debe ejecutarse sin errores fatales de ESLint.
3. **Pruebas Automatizadas Unitarias:**
   - `npm test` (Vitest) debe pasar el 100% de las pruebas existentes (20 suites, 73 tests).

### 7.2. Criterios de Aceptación Funcionales y de UX
- [x] **Causa raíz de escritura:** Identificada y documentada con precisión técnica.
- [ ] **Captura V2 funcional:** Se puede seleccionar temporada activa, jornada y partido; capturar asistencias, puntos y triples; y guardar exitosamente.
- [ ] **Persistencia real comprobada:** Al recargar la página (`F5`), los datos guardados en el partido y en las estadísticas persisten intactos desde la base de datos.
- [ ] **Búsqueda instantánea y orden A–Z:** Presentes y funcionales en el módulo de Equipos y Jugadores.
- [ ] **Botón "Limpiar filtros":** Presente en todas las vistas con filtros (Equipos, Calendario), restableciendo los controles con un solo click.
- [ ] **Contador dinámico de resultados:** Presente en las vistas con filtros mostrando formato `X de Y equipos / partidos`.
- [ ] **Temporada activa visible:** Siempre presente en el encabezado general del panel de administración.
- [ ] **Navegación unificada y limpia:** Sin duplicidad de enlaces entre la barra superior y la barra lateral.
- [ ] **Protección contra doble envío:** Implementada con `isSubmitting` / deshabilitado / spinner en todos los botones de guardado.
- [ ] **Responsive y ergonomía verificada:** Probado y calibrado a 1366×768 (espaciado denso y sin vacíos), 430px y 390px (móvil).
- [ ] **Cero pérdida de datos:** Base de datos íntegra, sin tablas truncadas ni modificaciones a la página pública.
