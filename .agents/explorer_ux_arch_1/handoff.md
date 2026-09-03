# Handoff Report — Admin UX & Architecture Explorer
**Working directory:** `d:\liga-nochixtlan-js\.agents\explorer_ux_arch_1`  
**Target:** Parent Orchestrator (`c408cb50-b8af-4c7b-a8ad-f5a4c4e36c02`)  
**Type:** Hard Handoff (Investigation Complete)  
**Detailed Report:** `d:\liga-nochixtlan-js\.agents\explorer_ux_arch_1\admin_ux_architecture.md`  

---

## 1. Observation

### Obs 1: App Shell & Layout Constraints
- **File:** `app/components/AdminLayout.tsx`
  - Line 44: `<Sider breakpoint="md" collapsedWidth={0} theme="dark" style={{ background: '#0d0d0d', borderRight: '1px solid #222' }}>`
  - Line 73-101: El botón de cierre de sesión (`Cerrar Sesión`) vive al fondo del `<Sider>`. Al colapsar en pantallas `< 768px` (`collapsedWidth={0}`), el botón desaparece y el usuario móvil queda sin opción para cerrar sesión.
  - Line 107-139: La navegación móvil consiste únicamente en `<div className="md:hidden" style={{ ... display: 'flex', overflowX: 'auto' }}>` que renderiza botones en un strip horizontal sin Topbar, sin título ni breadcrumbs.
  - Line 141: `<Content style={{ padding: '20px 16px', maxWidth: 960, margin: '0 auto', width: '100%' }}>`
  - En resoluciones de 1366×768 (espacio neto ~1166px), el límite fijo de 960px desperdicia más de 200px horizontales y fuerza scroll horizontal prematuro en tablas.
  - No existe Topbar en desktop. No hay breadcrumbs en ninguna pantalla. No hay indicador persistente de temporada activa.

### Obs 2: Gestión Descentralizada de Temporadas
- **Archivos:**
  - `app/admin/page.tsx` (líneas 41-44)
  - `app/admin/teams/page.tsx` (líneas 428-440)
  - `app/admin/calendar/page.tsx` (líneas 167-170)
  - `app/admin/capture/page.tsx` (líneas 84-87)
  - `app/admin/eligibility/page.tsx` (líneas 21-24)
- En cada página se repite el patrón idéntico:
  ```typescript
  useEffect(() => {
    supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
      .then(({ data }) => { if (data) setSeasonId(data.id); });
  }, []);
  ```
- Ninguna vista comparte el estado de la temporada seleccionada con otra. `package.json` incluye `"zustand": "^5.0.12"`, pero actualmente no se utiliza en ningún archivo del proyecto.

### Obs 3: Dashboard Desprovisto de Operatividad
- **File:** `app/admin/page.tsx`
  - Líneas 85-127: Renderiza un `<Row gutter={[16, 16]}>` iterando sobre `modules.map((mod) => ...)` mostrando tarjetas de navegación idénticas a los enlaces del Sidebar.
  - No existen consultas ni métricas clave (KPIs) para partidos jugados, pendientes de captura, equipos inscritos ni avance de temporada.
  - No existen alertas operativas ni atajos de creación directa (`+ Nuevo Partido`, `Capturar Resultado`).

### Obs 4: Equipos y Jugadores sin Búsqueda ni Filtros
- **File:** `app/admin/teams/page.tsx`
  - Líneas 1148-1202: El encabezado contiene únicamente el título `👥 Equipos`, un `<SeasonSelector>` y dos botones (`Emitir pendientes` y `Nuevo Equipo`).
  - No existe campo `<Input placeholder="Buscar equipo..." />`.
  - No existe barra de filtrado alfabético (`Todos | A | B | C ... | Z`).
  - No existen filtros por categoría, estatus (activo/baja) ni estado de credenciales.
  - No existe botón "Limpiar filtros" ni contador de resultados (`X de Y equipos`).
  - Líneas 1078-1125: La columna de acciones no tiene título (`title: ''`) y renderiza cuatro botones de icono pequeños sin etiquetas ni tooltips (`UserAddOutlined`, `EditOutlined`, `Cédula`, `DeleteOutlined`).

### Obs 5: Calendario con Acciones sin Jerarquizar y Filtros Redundantes
- **File:** `app/admin/calendar/page.tsx`
  - Líneas 1173-1227: `<Space wrap>` con 6 botones en fila: `Nuevo Partido` (primary), `Partidos Faltantes`, `Asistente de Jornada`, `WhatsApp`, `Rol Básico (Auto)`, `Arrancar Liguilla`. No hay distinción jerárquica clara.
  - Líneas 1118-1170: 6 selectores en grid donde `calendarStateFilter` (`all`, `played`, `pending_no_date`, `scheduled_no_result`) compite con `filterStatus` (`Todos`, `Pendiente`, `Programado`, `Jugado`).
  - No hay botón para limpiar filtros ni contador de partidos mostrados vs totales.

### Obs 6: Captura V2 con Fricción Crítica, Fuga de Contexto y Riesgo de Doble Clic
- **Files:** `app/admin/capture/page.tsx`, `app/components/CaptureForm.tsx`, `app/components/PlayerAttendanceTable.tsx`
  - En `page.tsx` (líneas 256-265): El selector de partidos es un `<Select>` que mezcla partidos jugados y pendientes sin orden de prioridad.
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
    El botón de guardado no tiene `disabled={saving}` ni `loading={saving}` directamente en el componente.
  - En `CaptureForm.tsx` (líneas 100-117): Al completar `handleSave`, se dispara `message.success(...)` y `onSaved?.()` ejecuta `setSelectedMatchId(null)`, destruyendo el formulario inmediatamente sin mostrar confirmación persistente ni botón para continuar al siguiente partido pendiente.
  - En `PlayerAttendanceTable.tsx` (líneas 65, 113, 122): Columnas con `fixed: 'left'`:
    - Foto: 76px
    - Número: 58px
    - Nombre: 280px
    - Ancho fijo total: $76 + 58 + 280 = 414\text{ px}$. En pantallas de 390px (iPhone), las columnas fijas cubren el 100% de la pantalla e impiden desplazar la tabla hacia las columnas de asistencia y puntos.
  - En `PlayerAttendanceTable.tsx` (líneas 157-170): El botón `Abrir` (para ver credencial) está colocado entre la casilla de asistencia y el campo de puntos en el orden de tabulación, interrumpiendo el flujo natural de captura con teclado `Tab` / `Shift+Tab`.

### Obs 7: Sistema de Diseño y Dependencias
- **File:** `package.json`
  - Dependencias presentes: `"antd": "^6.3.4"`, `"@ant-design/icons": "^6.1.0"`, `"@tanstack/react-query": "^5.95.2"`, `"zustand": "^5.0.12"`, `"tailwindcss": "^4"`.
  - Nota: El proyecto no usa Lucide icons; la paquetería estándar y unificada es `@ant-design/icons`.
  - `npm test`: 20 archivos de test y 73 pruebas unitarias pasan con código 0.
  - `npm run lint`: Pasa con código 0 sin advertencias.
  - `npm run build`: Compila en modo producción exitosamente con código 0 (Next.js 16.2.9 Turbopack).

---

## 2. Logic Chain

1. **De Obs 1 a Conclusión de Shell:**
   Dado que `maxWidth: 960px` restringe el `<Content>` en `AdminLayout.tsx` y no existe Topbar en desktop, la experiencia en monitores de 1366×768 se ve mutilada con franjas vacías laterales y tablas encogidas. Al mismo tiempo, en dispositivos móviles la ausencia de un Drawer o menú colapsable deja inaccesible la opción de cerrar sesión. Por tanto, el App Shell requiere una Topbar contextual fija, un contenedor de ancho fluido/`max-w-7xl`, y un Drawer móvil con botón de logout siempre accesible.

2. **De Obs 2 a Conclusión de Estado Central:**
   Dado que 5 módulos administrativos replican llamadas individuales a Supabase para obtener la temporada activa y no comparten su estado, navegar entre módulos resetea la temporada seleccionada. Dado que `zustand` ya está instalado en el proyecto, crear un store ligero (`lib/admin-store.ts`) resuelve la persistencia de la temporada activa a lo largo de todo el panel sin recargas ni dependencias adicionales.

3. **De Obs 3 a Conclusión de Dashboard:**
   Dado que `/admin/page.tsx` no calcula ni presenta ningún dato de la temporada activa y solo duplica los enlaces del menú lateral, el panel carece de utilidad operativa diaria. Implementar tarjetas de métricas (KPIs), alertas de partidos por capturar y accesos directos rápidos convierte a `/admin` en el centro de mando que exige la especificación R2.

4. **De Obs 4 y Obs 5 a Conclusión de Tablas y Filtros:**
   Dado que en `/admin/teams` no existe campo de texto de búsqueda, salto alfabético, filtros de categoría ni botón de limpieza, el administrador debe leer visualmente toda la lista. De igual modo, en `/admin/calendar` existen 6 filtros dispersos con redundancia y 6 botones de acción sin orden de prioridad. Estandarizar un componente `AdminFilterBar` con búsqueda instantánea, "Limpiar filtros", contador `X de Y` y jerarquizar `+ Nuevo Partido` resuelve la sobrecarga cognitiva.

5. **De Obs 6 a Conclusión de Captura V2:**
   Dado que el formulario de captura desborda en altura y carece de contexto sticky, el usuario pierde de vista el marcador. Dado que el botón `Abrir` intercepta la tecla `Tab` entre asistencia y puntos, el tipeo rápido se interrumpe. Dado que el botón de guardado no tiene `disabled={saving}`, hay riesgo de doble clic concurrente. Y dado que las columnas fijas de `PlayerAttendanceTable.tsx` suman 414px, en smartphones de 390px la tabla es inutilizable. Resolver esto requiere fijar el encabezado del partido (`sticky`), deshabilitar el botón mientras guarda (`disabled={saving}`), asignar `tabIndex={-1}` a botones auxiliares, mostrar confirmación persistente con atajo al siguiente partido y colapsar las columnas fijas en pantallas móviles.

---

## 3. Caveats

- **No caveats:** Todos los archivos relevantes del panel admin (`layout.tsx`, `page.tsx`, `teams`, `calendar`, `capture`, `eligibility`, `access`, `seasons`, `AntdProvider.tsx`, `globals.css`) fueron leídos y analizados directamente en el código fuente.
- Se verificó que la página pública no comparte estos componentes con el Admin (el Admin usa `AdminLayout.tsx` y componentes aislados en `app/admin/`), por lo que el rediseño del Admin no afectará en absoluto la página pública.

---

## 4. Conclusion

El Panel Admin actual posee la infraestructura funcional de datos, pero adolece de problemas severos de arquitectura de interfaz:
1. **Contenedor rígido de 960px y falta de Topbar** que desperdician la resolución de laptops (1366×768).
2. **Defecto crítico en móviles** donde 414px de columnas fijas bloquean la captura en 390px, y el botón de logout desaparece.
3. **Ausencia total de búsqueda instantánea, ordenación A–Z, botón "Limpiar filtros" y contador "X de Y"** en Equipos.
4. **Captura V2 no guiada**, con partidos pendientes ocultos entre los jugados, pérdida de contexto sticky al hacer scroll, interrupción de tabulación en teclado y feedback efímero sin flujo de siguiente partido.
5. **Dashboard estático y redundante** sin valor operativo.

El documento completo con la especificación técnica de cada componente y ruta ha sido generado en:
`d:\liga-nochixtlan-js\.agents\explorer_ux_arch_1\admin_ux_architecture.md`.

---

## 5. Verification Method

Para verificar independientemente estos hallazgos:
1. **Inspección de archivos y líneas:**
   - Visualizar `app/components/AdminLayout.tsx` en línea 141 (`maxWidth: 960`) y líneas 73-101 (`Cerrar Sesión` dentro de `Sider`).
   - Visualizar `app/components/PlayerAttendanceTable.tsx` en líneas 65, 113, 122 (columnas fijas de 76px + 58px + 280px = 414px).
   - Visualizar `app/components/CaptureForm.tsx` en línea 262 (botón sin `disabled={saving}`).
   - Visualizar `app/admin/teams/page.tsx` en líneas 1148-1205 (ausencia de búsqueda y filtros).
2. **Comandos automatizados del proyecto:**
   ```powershell
   npm test
   npm run lint
   npm run build
   ```
   Comprobado: Los tres comandos ejecutan y finalizan con código de salida 0.
