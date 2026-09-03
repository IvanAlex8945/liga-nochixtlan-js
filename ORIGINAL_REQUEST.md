# Original User Request

## 2026-09-03T20:06:35Z

Full team (Parallel specialist investigation & QA: Regression Investigator, Data Flow Auditor, Admin UX Auditor, Information Architecture, Search/Filter/Table Specialist, Capture Workflow Specialist, Responsive/Accessibility, Regression QA; Lead Integrator coordinates and verifies)

Reparar la capacidad de modificar/capturar datos en el Panel Admin de Liga Nochixtlán y rediseñar la experiencia del Admin hacia una interfaz moderna, rápida, compacta y de máxima productividad en desktop (1366×768 / 1920×1080) y móvil (390px / 430px).

Working directory: d:\liga-nochixtlan-js
Integrity mode: development
Reference specification: MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md

## Requirements

### R1. Diagnosticar y Reparar la Regresión de Escritura y Captura
- Reproducir la causa raíz por la cual actualmente no se pueden modificar o capturar datos en el panel de administración (en particular en `/admin/capture`, y verificar `/admin/teams`, `/admin/calendar`, `/admin/seasons`).
- Auditar flujo completo: UI → Formulario/Estado → Handlers → API / Supabase Client → DB → Respuesta → Refresh.
- Corregir el fallo respetando el schema y las reglas de negocio existentes sin pérdida de datos.
- Asegurar persistencia real comprobable tras recargar la página.

### R2. Rediseño de UX/UI del Admin para Máxima Productividad
- **App Shell & Navegación:** Sidebar único sin redundancias con Topbar contextual (temporada activa siempre visible, breadcrumbs no redundantes, usuario).
- **Dashboard Operativo:** Resumen de temporada activa, métricas clave, alertas de partidos pendientes y accesos directos rápidos.
- **Equipos & Jugadores (A–Z e Instant Search):** Listado ordenado alfabéticamente por defecto, buscador instantáneo con tolerancia razonable, filtros claros con botón "Limpiar filtros", contador de resultados (`X de Y equipos`), acciones visibles y no ambiguas.
- **Calendario Optimizado:** Filtros agrupados, progreso de temporada visible, jerarquía clara en acciones (`+ Nuevo Partido` primario, herramientas secundarias).
- **Captura V2 (Flujo Guiado):** Selección rápida e intuitiva de Jornada y Partido (partidos pendientes primero), contexto de partido sticky/visible, inputs de puntos/triples optimizados para teclado (`Tab`, `Shift+Tab`, autofocus), prevención contra doble envío, estados visuales inequívocos (loading, error descriptivo, éxito).
- **Diseño Visual & Responsive:** Tema dark funcional/profesional, optimizado para laptops 1366×768 (tablas densas, sin vacíos excesivos) y responsive real para smartphones (390px y 430px).

### R3. Restricciones de Seguridad e Integridad
- CERO pérdida de datos: NO resetear BD, NO truncar tablas, NO ejecutar migraciones destructivas.
- NO alterar variables de entorno ni secretos en `.env.local`.
- NO modificar el diseño ni componentes de la página pública aprobada.
- NO realizar `git push --force`, `git reset --hard`, deploy ni merge a producción.

## Verification Plan & Acceptance Criteria

### Automated Tests
- `npm run build` debe compilar exitosamente sin errores de TypeScript ni de empaquetado.
- `npm run lint` y `npm test` deben ejecutarse y pasar las pruebas existentes.

### Acceptance Criteria
- [ ] Causa raíz identificada y documentada con precisión técnica.
- [ ] Flujo de captura (`/admin/capture`) permite seleccionar temporada, jornada y partido, capturar asistencia y puntos/triples, y guardar exitosamente.
- [ ] Los datos capturados y editados persisten en base de datos tras recargar la página.
- [ ] Se implementó búsqueda instantánea y ordenamiento A–Z en Equipos/Jugadores.
- [ ] Botón "Limpiar filtros" y feedback de conteo (`X de Y`) presentes en vistas con filtros.
- [ ] Temporada activa visible en el encabezado del panel admin.
- [ ] Navegación limpia sin duplicidades entre Sidebar y Topbar.
- [ ] Protección contra doble envío (`isSubmitting` / disabled / spinner) en formularios de guardado.
- [ ] Interfaz completamente funcional y visualmente ajustada en resoluciones 1366×768, 390px y 430px.
- [ ] Build de producción (`npm run build`) pasa con código 0.
- [ ] Estado final etiquetado como `LISTO PARA PREVIEW`.
