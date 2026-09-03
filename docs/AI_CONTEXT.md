# Contexto rapido para IA

Este archivo es el mapa compacto del proyecto. Para una lectura optimizada ejecuta:

```powershell
npm run ai:context
```

## Proyecto

Liga Municipal de Basquetbol de Nochixtlan. Aplicacion Next.js para sitio publico, panel administrativo, calendario, captura de resultados, elegibilidad, credenciales digitales de jugadores y reportes.

## Stack actual

- Next.js 16.2.1 con App Router y React 19.
- TypeScript.
- Ant Design 6, Tailwind CSS 4 y CSS global en `app/globals.css`.
- Supabase para Auth, PostgreSQL y consultas de datos.
- TanStack Query para consultas cliente.
- Cloudinary para fotos de jugadores.
- jsPDF, jspdf-autotable y Recharts para reportes/graficas.
- Vitest para pruebas unitarias.

## Regla importante de Next

El repo advierte que esta version de Next puede tener APIs/convensiones distintas. Antes de cambios de Next/App Router, leer documentacion local en:

`node_modules/next/dist/docs/`

## Rutas principales

- `/`: pagina publica con standings, lideres, calendario y visuales de jornada.
- `/login`: acceso administrativo con Supabase Auth.
- `/admin`: panel administrativo.
- `/admin/teams`: equipos, jugadores, fotos, credenciales y PDFs.
- `/admin/calendar`: calendario, generacion de partidos, WhatsApp, liguilla y faltantes.
- `/admin/capture`: captura de resultado, asistencia, puntos y triples.
- `/admin/eligibility`: elegibilidad para liguilla.
- `/admin/access`: matriz local de roles/permisos.
- `/verificar/[token]`: verificacion de credencial por QR/token.
- `/verificar/manual` y `/verificar/no-token`: verificacion manual por codigo.

## Modulos clave

- `lib/liga.ts`: regla 3-1-0 de puntos de tabla.
- `lib/standings.ts`: calculo de posiciones.
- `lib/saveMatch.ts`: guarda resultados y estadisticas de jugadores.
- `lib/eligibility.ts`: formula de elegibilidad `floor(totalPartidosEquipo / 2) + 1`.
- `lib/access-control.ts`: roles y permisos locales.
- `lib/credential-render.ts`: render de credencial como imagen.
- `lib/credential-pdf.ts`: PDFs de credenciales.
- `lib/credential-verification.ts`: lectura y auditoria de credenciales.
- `lib/cloudinary.ts` y `lib/image-client.ts`: fotos de jugadores.
- `app/components/AdminLayout.tsx`: layout del panel.
- `app/components/CaptureForm.tsx`: formulario de captura del partido.
- `app/components/PlayerAttendanceTable.tsx`: tabla de asistencia/puntos/triples.
- `app/admin/calendar/MissingMatchesModal.tsx`: revision de partidos faltantes/espejos.
- `app/admin/calendar/LiguillaModal.tsx`: flujo de liguilla.

## Reglas de negocio

- Victoria: 3 puntos.
- Derrota en cancha: 1 punto.
- W.O. perdido: 0 puntos.
- W.O. ganado: 3 puntos y marcador por default.
- Doble W.O.: ambos equipos sin puntos de tabla.
- Jugadores con historial no se eliminan permanentemente; se marcan como baja para conservar estadisticas.
- Elegibilidad de liguilla: asistencias del jugador contra minimo requerido por partidos del equipo.
- Permisos/refuerzos por equipo: rango 0 a 3.

## Captura de resultados

La captura vive en `/admin/capture`.

Flujo:

- Selecciona temporada, jornada y partido.
- Carga jugadores activos de local y visitante.
- Si el partido no es Fase Regular, filtra por elegibilidad.
- Consulta credenciales vigentes por equipo.
- Captura asistencia, puntos y triples.
- `saveMatchResult` persiste estadisticas y resultado del partido.

Mejora reciente:

- En computadora, local y visitante ahora se muestran en tablas separadas de ancho completo.
- En la tabla de captura, foto, numero y jugador quedan fijos al desplazarse horizontalmente.
- Inputs de `Puntos` y `3PT` son mas grandes para evitar perder de vista nombre/numero al capturar.
- CSS especifico en `.capture-attendance-table` para no afectar otras tablas.

## Roles actuales

Definidos en `lib/access-control.ts`.

- `super_admin`: acceso total.
- `registro_equipos`: equipos, jugadores y cedulas.
- `programacion`: calendario.
- `captura_resultados`: captura y elegibilidad.

Tambien existe override local:

```powershell
$env:ADMIN_ROLE_OVERRIDES_JSON='{"correo@dominio.com":"captura_resultados"}'
```

## Credenciales digitales

Archivos clave:

- Migracion: `migration_player_credentials_phase1.sql`.
- APIs admin: `app/api/admin/*credential*/route.ts`.
- Verificacion publica/manual: `app/verificar/*` y `app/api/public/verify-code/route.ts`.
- Plantilla visual: `public/credentials/base_credencial_bueno.png`.
- Plantilla Master: `public/credentials/credencial_base_master.png`.

Estados esperados de credencial: vigente/activa, revocada o pendiente segun API/registro.

## Calendario y liguilla

- `app/admin/calendar/page.tsx` administra partidos, jornadas, sedes y difusion.
- `MissingMatchesModal.tsx` detecta cruces faltantes, conflictos y espejos de localia.
- `LiguillaModal.tsx` arma cuartos, semifinal, final y tercer lugar.
- Scripts de reporte/exportacion recientes en `scripts/` generan salidas en `exports/`.

## Pruebas y verificacion

Comandos:

```powershell
npm run lint
npm run build
npm run test
```

Pruebas actuales:

- `tests/liga.test.ts`
- `tests/standings.test.ts`
- `tests/eligibility.test.ts`
- `tests/access-control.test.ts`

## Despliegue

Proyecto enlazado con Vercel en `.vercel/project.json`.

Comando usado para produccion:

```powershell
npx vercel --prod --yes
```

URL de produccion:

`https://liga-nochixtlan-js.vercel.app`

## Advertencias de trabajo

- No tocar cambios no relacionados en el arbol de git.
- No guardar contrasenas o service role keys en Markdown/scripts.
- Las cuentas admin se administran desde Supabase Auth.
- `.env.local` contiene secretos locales; no imprimirlo ni copiarlo.
- Antes de cambiar rutas, middleware/proxy o App Router, revisar docs locales de Next.
- Antes de cambiar reglas deportivas, revisar pruebas en `tests/`.
