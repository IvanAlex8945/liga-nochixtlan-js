# Reporte de Arquitectura y Auditoría UX/UI del Panel Admin
**Proyecto:** Liga Municipal de Básquetbol de Nochixtlán  
**Rol:** Admin UX & Architecture Explorer  
**Fecha:** 2026-09-03  
**Estado:** Auditoría Completa — Línea Base y Brechas contra Especificación R2  

---

## 1. Resumen Ejecutivo y Línea Base

Se realizó una investigación exhaustiva del estado actual de la interfaz y arquitectura de usuario del Panel Administrativo de la Liga Nochixtlán (`/admin`), contrastando la implementación existente contra los requerimientos de la especificación **R2 (Rediseño UX/UI del Admin para Máxima Productividad)** de `MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md` y `ORIGINAL_REQUEST.md`.

### Diagnóstico Global
1. **App Shell & Layout:** El layout actual (`app/components/AdminLayout.tsx`) impone un `maxWidth: 960px` centrado con márgenes excesivos, desperdiciando espacio horizontal crítico en monitores desktop (1366×768 y 1920×1080), mientras carece de Topbar en desktop, carece de breadcrumbs, carece de visualización persistente de la temporada activa y carece de acceso a cerrar sesión en dispositivos móviles.
2. **Dashboard Operativo:** La página `/admin/page.tsx` no funciona como centro operativo: es únicamente un grid estático de tarjetas de navegación redundantes con el sidebar, sin métricas operativas (KPIs), sin alertas de partidos pendientes por capturar y sin atajos rápidos de creación.
3. **Equipos y Jugadores (`/admin/teams`):** Carece de buscador (`Buscar equipo...`), carece de ordenamiento o filtrado alfabético (A–Z), carece de filtros por categoría/estatus/credenciales, carece de botón "Limpiar filtros", carece de contador de resultados (`X de Y equipos`), y presenta acciones ambiguas compuestas por botones de icono sin etiquetas ni tooltips.
4. **Calendario (`/admin/calendar`):** Presenta una barra de 6 botones de acción sin jerarquía visual donde herramientas secundarias compiten con `+ Nuevo Partido`, filtros dispersos con redundancia y conflicto entre `calendarStateFilter` y `filterStatus`, sin botón "Limpiar filtros" ni contador de resultados filtrados.
5. **Captura V2 (`/admin/capture`):** El flujo no es guiado; el selector de partidos es un `<Select>` genérico donde partidos jugados y pendientes aparecen mezclados sin prioridad; no hay contexto sticky del partido (al hacer scroll vertical en las listas de jugadores se pierde de vista el partido y marcador); el orden de tabulación (`Tab`/`Shift+Tab`) se ve interrumpido por botones secundarios ("Abrir" verificación); el botón de guardado no tiene protección nativa contra doble clic (`disabled={saving}`); y el feedback tras guardar es un toast efímero que vacía el formulario sin confirmación persistente ni atajo al siguiente partido pendiente.
6. **Diseño Responsive & Densidad:** En 1366×768 el ancho restringido comprime tablas innecesariamente provocando scroll horizontal evitable. En smartphones (390px / 430px), la tabla de asistencia (`PlayerAttendanceTable.tsx`) tiene 3 columnas fijas a la izquierda que suman 414px (`photo: 76px + number: 58px + name: 280px`), bloqueando por completo la visibilidad e interacción con los checkboxes de asistencia y campos de puntos/triples en pantallas de 390px.
7. **Sistema de Diseño:** El proyecto utiliza **Ant Design 6 (`antd: ^6.3.4`)**, **`@ant-design/icons` (v6.1.0)** y **Tailwind CSS 4**. Ant Design está configurado con `borderRadius: 16` (excesivamente curvo para interfaces operativas de alta densidad) y colores inline hardcodeados (`#141414`, `#0d0d0d`, `#FAAD14`, `#1a1a1a`, `#222`) desfasados de las variables CSS maestras definidas en `app/globals.css`.

---

## 2. Auditoría Detallada por Área

### 2.1. App Shell & Navegación

**Archivos involucrados:**
- `app/admin/layout.tsx` (Server Component de autenticación y carga de permisos)
- `app/components/AdminLayout.tsx` (Client Component que renderiza la estructura visual del Admin)
- `app/components/AdminAccessProvider.tsx` (Context Provider que expone `useAdminAccess()`)

#### Hallazgos y Observaciones
1. **Desktop Sider sin Topbar:**
   - En `AdminLayout.tsx` (líneas 44-102), el Sider de Ant Design (`<Sider breakpoint="md" collapsedWidth={0} ...>`) es el único elemento de navegación.
   - En desktop **no existe Topbar**. El `<Content>` comienza directamente con el contenido de la página.
   - Consecuencia: No hay espacio para breadcrumbs, contexto persistente de temporada, buscador global, ni perfil de usuario con logout accesible.
2. **Contenedor con Ancho Artificial de 960px:**
   - En `AdminLayout.tsx` línea 141:
     ```tsx
     <Content style={{ padding: '20px 16px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
     ```
   - En monitores de 1366×768 (espacio disponible tras Sider: ~1166px), se desperdician 206px de ancho. En 1920×1080, se desperdician 760px.
   - Esto causa que tablas anchas como la de captura o calendario sufran scroll horizontal artificial cuando cabrían holgadamente en pantalla completa.
3. **Navegación Móvil Deficiente:**
   - En `AdminLayout.tsx` líneas 107-139:
     ```tsx
     <div style={{ background: '#0d0d0d', borderBottom: '1px solid #222', padding: '8px 0', display: 'flex', overflowX: 'auto' }} className="md:hidden">
     ```
   - La barra de navegación móvil es un contenedor con scroll horizontal de botones sin encabezado institucional ni indicador de ruta actual.
   - **Grave fallo de seguridad/usabilidad:** El botón "Cerrar Sesión" (líneas 73-101) está ubicado al fondo del `<Sider>`. Al colapsar el Sider en móviles (`collapsedWidth={0}`), el botón de cerrar sesión desaparece por completo y el usuario no puede cerrar su sesión desde el teléfono.
4. **Contexto de Temporada Descentralizado:**
   - No existe un estado global ni indicador visual en el shell de la temporada activa.
   - Cada página (`/admin`, `/admin/teams`, `/admin/calendar`, `/admin/capture`, `/admin/eligibility`) gestiona su propio `const [seasonId, setSeasonId] = useState<number | null>(null)` y consulta de forma independiente la temporada activa a Supabase:
     ```tsx
     useEffect(() => {
       supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
         .then(({ data }) => { if (data) setSeasonId(data.id); });
     }, []);
     ```
   - Cambiar de temporada en una vista no sincroniza las demás vistas. Si el administrador navega entre Equipos y Calendario, el estado se resetea.
5. **Breadcrumbs Ausentes:**
   - Ninguna pantalla del panel administrativo cuenta con breadcrumbs. El administrador no cuenta con retroalimentación visual de su ubicación jerárquica (e.g., `Admin / Equipos / Muebles Carlitos / Cédula`).

---

### 2.2. Dashboard Operativo (`/admin`)

**Archivo involucrado:**
- `app/admin/page.tsx`

#### Hallazgos y Observaciones
1. **Redundancia Total de Navegación:**
   - El cuerpo del dashboard consiste exclusivamente en un `Row/Col` que mapea `getVisibleAdminModules()` (líneas 85-127), mostrando tarjetas que duplican exactamente los mismos módulos que ya están en el menú lateral izquierdo.
2. **Cero Métricas Operativas (KPIs):**
   - No se muestra información clave de la temporada seleccionada:
     - Número de equipos inscritos.
     - Total de partidos jugados vs programados.
     - Porcentaje de avance de la temporada.
     - Jugadores registrados y credenciales pendientes.
3. **Cero Alertas Operativas:**
   - No alerta sobre partidos pendientes de captura de la jornada actual.
   - No alerta sobre equipos con W.O. acumulados (≥4 W.O. o en riesgo).
   - No alerta sobre credenciales sin emitir.
4. **Cero Accesos Directos Rápidos:**
   - No existen botones de acción rápida como:
     - `+ Nuevo Partido`
     - `Capturar Resultado`
     - `+ Nuevo Equipo`
     - `Revisar Elegibilidad`
     - `Difusión WhatsApp`

---

### 2.3. Equipos y Jugadores (`/admin/teams`)

**Archivos involucrados:**
- `app/admin/teams/page.tsx`
- `app/admin/teams/[teamId]/cedula/page.tsx`

#### Hallazgos y Observaciones
1. **Falta de Búsqueda Instantánea:**
   - La página carga todos los equipos de la temporada (`teams`), pero no tiene ningún campo de texto de búsqueda (`Buscar equipo...`). El usuario debe recorrer visualmente la tabla renglón por renglón.
2. **Ausencia de Filtro Alfabético (A–Z):**
   - Aunque la consulta SQL tiene `.order('name')`, no existe barra de salto alfabético (`Todos | A | B | C | ... | Z`) para filtrar o desplazarse velozmente a una letra en torneos con 20 o más equipos.
3. **Falta de Filtros por Categoría, Estatus y Credenciales:**
   - No se puede filtrar por categoría (Libre, Veteranos, Femenil, 3ra, Master).
   - No se puede filtrar por estatus (Activos vs Dados de Baja).
   - No se puede filtrar por estado de credenciales (Equipos con jugadores pendientes de credencial).
4. **Falta de Botón "Limpiar Filtros" y Contador "X de Y":**
   - No existe botón para restablecer filtros.
   - No se indica cuántos equipos se están visualizando respecto al total (e.g. `12 de 18 equipos`).
5. **Acciones Ambiguas en la Tabla de Equipos:**
   - En `teamCols` (líneas 1078-1125):
     - La columna no tiene encabezado (`title: ''`).
     - Renderiza cuatro botones pequeños:
       1. `<Button icon={<UserAddOutlined />} onClick={() => openNewPlayerModal(row.id)} />`: No tiene texto ni tooltip. Abre el modal de jugadores/inscripción.
       2. `<Button icon={<EditOutlined />} onClick={() => ...} />`: Sin texto ni tooltip. Edita metadatos del equipo.
       3. `<Button>Cédula</Button>`: Botón con texto que navega a `/admin/teams/[id]/cedula`.
       4. `<Button danger icon={<DeleteOutlined />} onClick={() => ...} />`: Elimina el equipo en cascada.
     - Falta de jerarquía: Una acción destructiva (eliminar) comparte el mismo peso visual directo junto a las acciones cotidianas. Debería existir una acción principal visible (`Ver Cédula` o `Gestionar`) y un menú de opciones secundarias (`⋯`).
6. **Gestión de Jugadores dentro del Modal:**
   - El modal de jugadores (`playerModal`, líneas 1321-1400) lista a los jugadores como una nube de `<Tag>` sin buscador por nombre ni por número dorsal, y sin ordenación explícita.
   - En equipos con 15 a 20 jugadores, encontrar a un jugador específico para editarlo o subir su foto exige escanear visualmente cada etiqueta.

---

### 2.4. Calendario (`/admin/calendar`)

**Archivos involucrados:**
- `app/admin/calendar/page.tsx`
- `app/admin/calendar/MissingMatchesModal.tsx`
- `app/admin/calendar/LiguillaModal.tsx`
- `app/components/AdminEditForm.tsx`

#### Hallazgos y Observaciones
1. **Sobrecarga y Falta de Jerarquía en Botones de Acción:**
   - En líneas 1173-1227, el encabezado contiene 6 botones en un `<Space wrap>`:
     1. `Nuevo Partido` (tipo primary)
     2. `Partidos Faltantes` (secundario)
     3. `Asistente de Jornada` (secundario con borde `#13c2c2`)
     4. `WhatsApp` (secundario con borde `#25D366`)
     5. `Rol Básico (Auto)` (secundario)
     6. `🔥 Arrancar Liguilla` (secundario con borde `#FAAD14`)
   - Esta proliferación de bordes de colores heterogéneos satura visualmente y diluye la acción principal (`+ Nuevo Partido`).
2. **Filtros Dispersos y Redundantes:**
   - En líneas 1118-1170 se colocan 6 selectores independientes:
     - `teamFilterIds` (múltiple)
     - `vueltaFilter` (todas, ida, vuelta, liguilla)
     - `calendarStateFilter` (todos, jugado, pendiente_no_date, scheduled_no_result)
     - `courtFilter` (todas las canchas)
     - `filterStatus` (todos, pendiente, programado, jugado)
     - `jornadaFilter` (todas las jornadas)
   - `calendarStateFilter` y `filterStatus` se traslapan conceptualmente, creando combinaciones confusas para el usuario (por ejemplo, seleccionar "Pendiente" en `filterStatus` y "Pendiente sin fecha" en `calendarStateFilter`).
   - No hay botón "Limpiar filtros" para reiniciar los 6 selectores en un clic.
   - No hay contador de resultados filtrados (`X de Y partidos mostrados`).
3. **Puntos Fuertes Existentes a Preservar:**
   - El panel de progreso de temporada regular (líneas 1236-1285) con `Progress percent={regularProgressPercent}` y las tarjetas de Jornada actual, Partidos jugados, Avance, Faltantes reales y Conflictos es de alto valor y debe mantenerse, integrándose visualmente en un formato más compacto.
   - El módulo "Calendario por equipo" (líneas 1287-1347) con balance de sedes (ida/vuelta por cancha) funciona correctamente y debe ser accesible como vista analítica secundaria o pestaña.

---

### 2.5. Captura V2 (`/admin/capture`)

**Archivos involucrados:**
- `app/admin/capture/page.tsx`
- `app/components/CaptureForm.tsx`
- `app/components/PlayerAttendanceTable.tsx`
- `lib/saveMatch.ts`

#### Hallazgos y Observaciones
1. **Flujo de Selección de Partido Ineficiente:**
   - El selector de partido (`app/admin/capture/page.tsx`, líneas 251-267) es un simple `<Select showSearch>` de Ant Design.
   - Los partidos se ordenan únicamente por jornada y número de id, mezclando partidos ya finalizados/jugados con partidos pendientes.
   - El administrador tiene que buscar manualmente el partido que se acaba de jugar entre decenas de partidos ya capturados.
   - **Requisito R2 incumplido:** Los partidos **pendientes de captura** deben aparecer primero con distinción visual inmediata respecto a los finalizados.
2. **Pérdida de Contexto Sticky del Partido:**
   - Al seleccionar un partido, se renderizan los datos generales del partido arriba (líneas 275-286), seguidos del marcador acumulado en vivo (`CaptureForm.tsx`, líneas 161-221) y de las dos tablas completas de asistencia (local y visitante).
   - En una cédula típica de 12 a 15 jugadores por equipo, la página alcanza fácilmente más de 1200px de altura.
   - Al hacer scroll hacia abajo para capturar puntos del equipo visitante, **el encabezado del partido y el marcador general desaparecen de la vista**. El usuario pierde la referencia de qué partido está capturando y cómo va el resultado global acumulado.
3. **Ergonomía de Teclado y Flujo de Captura Deficiente:**
   - En `PlayerAttendanceTable.tsx`:
     - Columna 4: `<Checkbox checked={row.played} />` (asistencia).
     - Columna 5: `<Button size="middle">Abrir</Button>` (botón para abrir verificación de credencial).
     - Columna 6: `<InputNumber value={row.points} />` (puntos).
     - Columna 7: `<InputNumber value={row.triples} />` (triples).
   - Al capturar con teclado usando `Tab`:
     - El cursor pasa de la casilla de asistencia al botón `Abrir` de verificación, requiriendo un tab adicional innecesario para llegar al campo de puntos.
     - El botón `Abrir` no pertenece al flujo de captura rápida de estadísticas; debe tener `tabIndex={-1}` o reubicarse fuera del flujo principal de entrada numérica.
   - No existe soporte para avanzar de fila con la tecla `Enter` o flecha abajo entre puntos del jugador 1 al jugador 2, obligando a alternar teclado y ratón o pulsar múltiples tabs.
   - No existe `autoFocus` en el primer campo editable al seleccionar un partido.
4. **Vulnerabilidad a Doble Envío:**
   - En `CaptureForm.tsx` (líneas 262-275):
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
   - El botón **no** tiene la propiedad `disabled={saving}` ni `loading={saving}` asignada directamente.
   - Aunque existe un componente envolvente `<Spin spinning={saving}>`, en clics sucesivos rápidos (doble clic accidental) el handler `handleSave` puede dispararse dos veces antes de que el estado de React bloquee los eventos del DOM, arriesgando llamadas duplicadas a la base de datos.
5. **Retroalimentación tras Guardar (Feedback):**
   - En `handleSave` (líneas 100-118):
     ```tsx
     await saveMatchResult(...);
     await invalidatePublicCache({ seasonId });
     message.success('Resultado guardado correctamente');
     onSaved?.();
     ```
   - Al invocarse `onSaved?.()`, `CapturePage` ejecuta `setSelectedMatchId(null)`.
   - Efecto en pantalla: El formulario entero desaparece bruscamente y la vista vuelve a un selector de partidos en blanco. El usuario solo ve un toast flotante de 3 segundos que desaparece.
   - **Gaps contra R2:** Falta una pantalla/banner de confirmación inequívoca que muestre el resumen del resultado guardado (e.g. `✓ Resultado guardado: Muebles Carlitos 54 - 48 M-Sport`), con opciones claras:
     - `Capturar siguiente partido pendiente`
     - `Ver partido en calendario`
     - `Capturar otro partido`

---

### 2.6. Responsive & Densidad Visual

#### Escritorio Compacto (1366×768)
1. **Espaciado y Relleno Excesivo:**
   - Contenedores con `padding: 20px 16px`, `marginBottom: 24px`, títulos `level={3}` y márgenes de 32px empujan el contenido crítico por debajo de la línea de visibilidad (fold) de 768px.
2. **Ancho Forzado a 960px:**
   - Obliga a tablas anchas a tener scrollbars cuando en una pantalla de 1366px tienen más de 1150px de ancho neto utilizable.

#### Smartphones (390px y 430px)
1. **Bloqueo Crítico por Columnas Fijas en `PlayerAttendanceTable.tsx`:**
   - En `PlayerAttendanceTable.tsx` (líneas 65, 113, 122), tres columnas tienen `fixed: 'left'`:
     - Foto: `width: 76px`
     - Número: `width: 58px`
     - Nombre del jugador: `width: 280px`
   - **Suma de ancho fijo a la izquierda:** $76 + 58 + 280 = 414\text{ px}$.
   - En un iPhone estándar (390px de viewport width):
     - $414\text{ px} > 390\text{ px}$.
     - Las columnas fijas desbordan la pantalla móvil e impiden ver y desplazar las columnas de asistencia (`played`), puntos (`points`) y triples (`triples`).
     - En 430px (iPhone Pro Max / Plus), solo quedan $16\text{ px}$ libres para scroll.
   - **Solución arquitectónica:** En pantallas `< 640px`, desacoplar la foto a un tamaño de 32px o eliminar `fixed: 'left'`, reducir el ancho de la columna de nombre a 140px o apilar el número y nombre en una sola columna vertical, o renderizar un formato de tarjeta/fila móvil compacta.
2. **Marcador en Vivo en Móvil:**
   - En `CaptureForm.tsx` (líneas 161-221), el marcador tiene fuentes de tamaño `54px` en un contenedor con `gap: 24px` horizontal.
   - En 390px, este contenedor comprime los nombres de los equipos y produce saltos de línea antiestéticos o desbordamiento.
3. **Navegación Móvil y Cierre de Sesión:**
   - Como se identificó en el App Shell, la barra horizontal `md:hidden` carece de botón de cierre de sesión, dejando a los administradores en teléfono sin posibilidad de desloguearse.

---

### 2.7. Sistema de Diseño, Librerías y Primitivas UI

**Librerías instaladas en `package.json`:**
- `antd: ^6.3.4`
- `@ant-design/icons: ^6.1.0`
- `tailwindcss: ^4` y `@tailwindcss/postcss: ^4`
- `zustand: ^5.0.12` (instalado pero aún no utilizado)
- `@tanstack/react-query: ^5.95.2`
- `dayjs: ^1.11.20`

#### Observaciones sobre Componentes y Estilos
1. **Librería de Iconos:**
   - La especificación R2 menciona como referencia iconos tipo Lucide, pero el proyecto tiene implementado de manera estándar y tipada **`@ant-design/icons`**. No se debe agregar una dependencia adicional si `@ant-design/icons` cubre todos los glifos necesarios (`SearchOutlined`, `FilterOutlined`, `CheckOutlined`, `CloseOutlined`, `TrophyOutlined`, `CalendarOutlined`, `TeamOutlined`, `UserOutlined`, etc.).
2. **Tema Ant Design (`AntdProvider.tsx`):**
   - Actualmente define:
     ```typescript
     borderRadius: 16,
     colorPrimary: '#FAAD14',
     colorBgBase: '#141414',
     colorTextBase: '#FFFFFF',
     ```
   - Un `borderRadius: 16` resulta excesivamente redondeado para tablas y controles densos de software administrativo. Debe ajustarse a `token.borderRadius: 8` o `6` para el entorno admin, preservando la estética sobria.
3. **Alineación con Variables Maestras de `globals.css`:**
   - En lugar de usar hexadecimales dispersos (`#141414`, `#0d0d0d`, `#1a1a1a`, `#2a2a2a`), el panel admin debe utilizar tokens consistentes:
     - Superficie base: `#090d14` / `var(--surface-page)`
     - Superficie tarjeta/sección: `#111622` / `var(--surface-section)`
     - Superficie elevada/popups: `#182030` / `var(--surface-elevated)`
     - Bordes: `rgba(255, 255, 255, 0.08)` / `rgba(245, 158, 11, 0.2)`
     - Acento primario: `#f59e0b` / `var(--oro-mixteco)`
     - Textos: `#f8fafc` (primario), `#94a3b8` (secundario/muted)

---

## 3. Matriz de Brechas por Ruta Administrativa

| Ruta | Componente Principal | Brecha Actual Identificada | Requisito R2 | Nivel de Impacto |
|---|---|---|---|---|
| **App Shell** | `app/components/AdminLayout.tsx` | Contenedor locked a `maxWidth: 960px`; sin Topbar en desktop; sin breadcrumbs; sin temporada activa visible; sin logout en móvil. | Sidebar compacto + Topbar unificada con temporada activa fija, breadcrumbs dinámicos, perfil de usuario con logout accesible y ancho dinámico (`max-w-7xl` o fluido con padding controlado). | 🔴 Crítico |
| **/admin** (Dashboard) | `app/admin/page.tsx` | Grid estático de tarjetas de módulos (duplicado del sidebar); selector de temporada desconectado; 0 KPIs; 0 alertas; 0 atajos. | Dashboard Operativo: Resumen de temporada activa, 4-5 KPIs clave (equipos, partidos, %, jugadores), alertas de partidos pendientes y atajos rápidos (`+ Partido`, `Capturar`, `+ Equipo`). | 🔴 Crítico |
| **/admin/teams** | `app/admin/teams/page.tsx` | Sin buscador (`Buscar equipo...`); sin filtro A–Z; sin filtros de categoría/estatus/credenciales; sin botón "Limpiar filtros"; sin contador `X de Y`; acciones con botones pequeños sin labels ni tooltips. | Búsqueda instantánea en cliente con debounce/tolerancia; barra de filtro alfabético; filtros de categoría y credenciales; botón "Limpiar filtros"; contador `X de Y`; acciones claras con menú `⋯` secundario. | 🔴 Crítico |
| **/admin/calendar** | `app/admin/calendar/page.tsx` | 6 botones de acción sin jerarquía visual; filtros dispersos con redundancia `calendarStateFilter` vs `filterStatus`; sin "Limpiar filtros"; sin contador de resultados. | Jerarquía de acciones con `+ Nuevo Partido` prominente; botones secundarios agrupados o en menú; filtros limpios en una sola barra; botón "Limpiar filtros" y feedback `X de Y partidos`. | 🟡 Alto |
| **/admin/capture** | `app/admin/capture/page.tsx`, `CaptureForm.tsx`, `PlayerAttendanceTable.tsx` | Selector sin priorizar pendientes; contexto de partido no sticky (se pierde al hacer scroll); `Tab` interrumpido por botón "Abrir"; botón sin `disabled={saving}`; feedback efímero sin confirmación persistente ni atajo al siguiente juego. | Flujo guiado; partidos pendientes primero en lista rica; encabezado sticky con marcador en vivo; navegación por teclado optimizada (`tabIndex={-1}` en "Abrir", autoFocus, Enter); prevención estricta de doble envío; estado de confirmación con atajo al siguiente partido. | 🔴 Crítico |
| **/admin/seasons** | `app/admin/seasons/page.tsx` | Tabla plana sin buscador, sin filtro de categoría ni año, sin "Limpiar filtros". | Buscador de temporadas, filtro por categoría y estado (activa/histórica), orden cronológico claro. | 🟢 Medio |
| **/admin/eligibility** | `app/admin/eligibility/page.tsx` | Selector de equipo sin buscador enriquecido ni estado general de avance de elegibilidad. | Selector ágil con buscador instantáneo, resumen de elegibilidad por equipo y visualización compacta. | 🟢 Medio |
| **/admin/access** | `app/admin/access/page.tsx` | Vista estática funcional pero con diseño básico no integrado al nuevo sistema de tokens. | Presentación limpia de la matriz de roles y permisos del usuario activo, acorde al nuevo sistema visual. | 🟢 Bajo |

---

## 4. Arquitectura Propuesta para la Implementación

Para que el integrador ejecute los cambios de forma modular, segura y sin romper la lógica existente, se propone la siguiente arquitectura:

### 4.1. Store Global de Estado Admin (`lib/admin-store.ts`)
Aprovechar la dependencia ya instalada `zustand`:
```typescript
interface AdminState {
  activeSeasonId: number | null;
  activeSeasonName: string | null;
  activeSeasonCategory: string | null;
  setActiveSeason: (id: number, name?: string, category?: string) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}
```
Esto permite que:
- La Topbar muestre y cambie la temporada activa globalmente.
- Todas las páginas (`Teams`, `Calendar`, `Capture`, `Eligibility`, `Dashboard`) lean la temporada seleccionada desde el store central sin tener que volver a consultarla en cada navegación.

### 4.2. Nuevo App Shell (`app/components/AdminLayout.tsx`)
1. **Topbar Unificada:**
   - Izquierda: Botón hamburguesa (móvil/colapso sidebar), Breadcrumb contextual (`Admin / Equipos`), Badge de Temporada Activa (`🏆 Tercera Fuerza 2026 · Activa`).
   - Derecha: Badge de rol (`Administrador General`), Avatar con inicial o email del usuario, botón "Ver Sitio Público", Menú desplegable con opción "Cerrar Sesión".
2. **Sidebar Responsive:**
   - Desktop: Ancho compacto (220px o colapsable a 64px de iconos).
   - Móvil: Drawer deslizable de Ant Design que se abre con el botón hamburguesa, conteniendo la lista de navegación y el botón de cierre de sesión siempre visible al pie.
3. **Área de Contenido:**
   - Eliminar `maxWidth: 960px`. Usar `max-w-7xl` (1280px) o ancho fluido con `padding: 16px 20px` en desktop y `padding: 12px 8px` en móvil, permitiendo que las tablas respiren.

### 4.3. Componentes Primitivos Reutilizables
Crear en `app/components/admin/`:
1. `AdminHeader.tsx`: Encabezado estándar para vistas admin con título, descripción, selector de temporada integrado (si se requiere cambiar), y espacio para la acción primaria.
2. `AdminFilterBar.tsx`: Barra reutilizable que agrupa:
   - Input de búsqueda con debounce e icono de lupa.
   - Selectores de filtro (categoría, estado, etc.).
   - Botón "Limpiar filtros" (visible cuando hay filtros activos).
   - Contador de resultados (`8 de 18 equipos`, `14 de 32 partidos`).
3. `AlphabetFilter.tsx`: Fila de botones compactos `Todos | A | B | C ... | Z` para filtrar por inicial.
4. `StickyContextBar.tsx`: Barra sticky para el formulario de captura que mantiene visibles los nombres de los equipos, jornada y marcador acumulado mientras se capturan jugadores en la tabla.

### 4.4. Rediseño de Captura V2
1. **Selector de Partidos Inteligente:**
   - Dividir la lista de partidos en dos grupos:
     - ⏳ **Pendientes de captura** (arriba, destacados).
     - ✅ **Capturados / Finalizados** (abajo, atenuados).
2. **Sticky Match Scoreboard:**
   - Fijar una barra superior (`position: sticky, top: 0, zIndex: 10`) con:
     - `Jornada X | Local (Score) vs (Score) Visita`
     - Botón flotante de guardado rápido si los datos son válidos.
3. **Optimización de Teclado:**
   - Asignar `tabIndex={-1}` al botón "Abrir" de verificación de credenciales para no obstaculizar el flujo numérico.
   - Habilitar avance con `Enter` entre casillas de puntos de la misma columna.
   - Añadir `autoFocus` al primer campo al cargar el partido.
4. **Protección Estricta contra Doble Envío:**
   - Asignar explícitamente al botón de guardado:
     ```tsx
     <Button
       type="primary"
       loading={saving}
       disabled={saving}
       onClick={handleSave}
     >
     ```
5. **Confirmación y Siguiente Partido:**
   - Tras guardar con éxito, en lugar de borrar el formulario de golpe, mostrar un estado de éxito (`Result` o card verde) con:
     - `✓ Partido guardado exitosamente: Local 62 - 58 Visita`
     - Botón primario: `Capturar siguiente partido pendiente (Jornada X)`
     - Botón secundario: `Seleccionar otro partido`

---

## 5. Resumen de Archivos a Modificar para Integración

1. **Shell y Estado:**
   - `lib/admin-store.ts` (Nuevo store Zustand para temporada activa y UI state).
   - `app/components/AdminLayout.tsx` (Rediseño completo de Topbar, Sidebar, Drawer móvil y eliminación de `maxWidth: 960px`).
   - `app/components/AntdProvider.tsx` (Ajuste de tokens: `borderRadius: 8`, colores de tokens acordes a duela/oro mixteco).
2. **Dashboard:**
   - `app/admin/page.tsx` (Transformación en centro de operaciones con KPIs, alertas y atajos).
3. **Equipos y Jugadores:**
   - `app/admin/teams/page.tsx` (Adición de buscador instantáneo, filtro A-Z, filtros de categoría/credenciales, "Limpiar filtros", contador `X de Y`, jerarquía de acciones).
4. **Calendario:**
   - `app/admin/calendar/page.tsx` (Jerarquización de acciones con `+ Nuevo Partido` primario, agrupación de filtros, "Limpiar filtros", contador `X de Y`).
5. **Captura V2:**
   - `app/admin/capture/page.tsx` (Selector de partidos con pendientes primero, pantalla de confirmación y siguiente partido).
   - `app/components/CaptureForm.tsx` (Contexto sticky, protección contra doble envío, layout responsive).
   - `app/components/PlayerAttendanceTable.tsx` (Corrección de columnas fijas para 390px, `tabIndex={-1}` en "Abrir", navegación teclado fluida).

---
*Reporte compilado para el Lead Integrator y agentes ejecutores de la etapa de Rediseño.*
