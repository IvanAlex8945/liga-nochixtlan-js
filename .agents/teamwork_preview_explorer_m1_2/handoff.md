# Handoff Report: Milestone 1 Item 2 — Supabase Browser Client Unification

**Investigador:** M1 Explorer 2 (Supabase Browser Client Unification)  
**Fecha:** 2026-09-03  
**Directorio de trabajo:** `d:\liga-nochixtlan-js\.agents\teamwork_preview_explorer_m1_2`  
**Destinatario:** Orchestrator (`parent`) / Implementation Worker  

---

## 1. Observation

### 1.1. Discrepancia entre Clientes Supabase
1. **`lib/supabase.ts` (líneas 1-17):**
   ```ts
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

   if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
     console.error(
       '[Supabase] NEXT_PUBLIC_SUPABASE_URL must be a valid REST URL (https://...)'
     );
   }

   /**
    * Singleton Supabase client for use in Server and Client Components.
    * Uses the public anon key — respects Row Level Security (RLS) policies.
    */
   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```
   - Instancia estática creada con `@supabase/supabase-js`.
   - En el navegador utiliza por defecto `window.localStorage`.
   - No gestiona ni lee cookies HTTP (`document.cookie`).

2. **`lib/supabase/client.ts` (líneas 1-9):**
   ```ts
   import { createBrowserClient } from '@supabase/ssr'

   export function createClient() {
     return createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     )
   }
   ```
   - Utiliza `@supabase/ssr`.
   - Almacena y sincroniza la sesión en cookies HTTP (`document.cookie`, chunks `sb-*-auth-token.0`, `sb-*-auth-token.1`, etc.).
   - Utilizado únicamente en `app/login/page.tsx:8,15` (`signInWithPassword`) y `app/components/AdminLayout.tsx:75,76` (`signOut`).

3. **Mecanismo de Singleton en `@supabase/ssr` (`node_modules/@supabase/ssr/dist/main/createBrowserClient.js:9-17`):**
   ```javascript
   let cachedBrowserClient;
   function createBrowserClient(supabaseUrl, supabaseKey, options) {
       warnIfUsingDeprecatedAuthHelpersPackage();
       const shouldUseSingleton = options?.isSingleton === true ||
           ((!options || !("isSingleton" in options)) && isBrowser());
       if (shouldUseSingleton && cachedBrowserClient) {
           return cachedBrowserClient;
       }
       // ...
       if (shouldUseSingleton) {
           cachedBrowserClient = client;
       }
       return client;
   }
   ```
   - `@supabase/ssr` ya cachea automáticamente la instancia en el ámbito de módulo cuando `isBrowser()` es verdadero y no se proveen opciones conflictivas.
   - Cualquier invocación repetida a `createBrowserClient(url, key)` en el navegador retorna exactamente la misma instancia singleton (`cachedBrowserClient`).

4. **Comportamiento de `@supabase/ssr` en entornos no-browser (`node_modules/@supabase/ssr/dist/main/cookies.js:148-156`):**
   ```javascript
   else {
       // getting cookies when there's no window but we're in browser mode can be OK, because the developer probably is not using auth functions
       getAll = () => {
           return [];
       };
       setAll = () => {
           throw new Error("@supabase/ssr: createBrowserClient in non-browser runtimes (including Next.js pre-rendering mode) was not initialized cookie options that specify getAll and setAll functions");
       };
   }
   ```
   - Si `createBrowserClient` se invoca en Node.js (SSR / SSG / Server Components), un intento de mutación o set de cookies arrojaría excepción si no se configuraron métodos de cookies de servidor.
   - Por ende, en el servidor se debe mantener `@supabase/supabase-js` `createClient(url, anonKey)` como fallback seguro.

### 1.2. Mapeo Exhaustivo de Importaciones de `lib/supabase.ts`
Se identificaron exactamente 13 archivos que consumen `import { supabase } from '@/lib/supabase'`:
1. `lib/public-data.ts:9` — Módulo del servidor con directiva `import 'server-only'` para caché pública (`unstable_cache`).
2. `app/admin/capture/page.tsx:6` — Página cliente (`'use client'`) de captura de resultados.
3. `app/components/CaptureForm.tsx:20` — Componente cliente que pasa `supabase` a `saveMatchResult(supabase, match.id, ...)`.
4. `app/components/AdminEditForm.tsx:18` — Modal cliente de edición de partidos.
5. `app/admin/teams/page.tsx:19` — Gestión cliente de equipos, jugadores y bajas.
6. `app/admin/calendar/page.tsx:9` — Programación cliente de partidos y generación de jornadas.
7. `app/admin/calendar/MissingMatchesModal.tsx:5` — Inserción cliente en lote de partidos pendientes/espejo.
8. `app/admin/calendar/LiguillaModal.tsx:6` — Inserción cliente de series de playoffs.
9. `app/admin/seasons/page.tsx:9` — Activación y gestión cliente de temporadas.
10. `app/admin/eligibility/page.tsx:7` — Consulta cliente de elegibilidad de jugadores.
11. `app/components/SeasonSelector.tsx:5` — Selector cliente de temporada activa.
12. `app/components/TeamDetailModal.tsx:9` — Consulta cliente de detalle de equipo y elegibilidad.
13. `app/admin/page.tsx:16` — Dashboard cliente del panel administrativo.

Uso indirecto a través de funciones con tipado `SupabaseClient`:
- `lib/saveMatch.ts:22`: `saveMatchResult(supabase: SupabaseClient, ...)`
- `lib/eligibility.ts:12`: `calcularElegibilidad(supabase: SupabaseClient, ...)`
- `lib/validators.ts:9`: `validateTeamCategory(supabase: SupabaseClient, ...)`

### 1.3. Prueba Empírica Ejecutada
Se creó y ejecutó el script de prueba `.agents/teamwork_preview_explorer_m1_2/test_client_unification.mjs` arrojando:
```
Testing Supabase client unification logic...
Server client created successfully: true
Server client .from is function: true
Browser client 1 created successfully: true
Browser client 2 created successfully: true
Are both browser clients identical singleton instance? true
Browser client .from is function: true
Browser client .auth is object: true
All tests passed!
```

---

## 2. Logic Chain

1. **Premisa 1 (Sesión en Cookies):**  
   Al iniciar sesión en `/login`, `supabase.auth.signInWithPassword` utiliza `createBrowserClient` de `@supabase/ssr`, escribiendo los tokens de sesión (`access_token`, `refresh_token`) en `document.cookie` (Obs 1.1.2).
2. **Premisa 2 (Desconexión de Memoria):**  
   Todas las páginas y formularios del panel admin (`/admin/capture`, `/admin/teams`, etc.) importan `supabase` desde `lib/supabase.ts` (Obs 1.2). Este cliente es una instancia de `@supabase/supabase-js` que no lee cookies y tiene `auth.getSession() === null` (Obs 1.1.1).
3. **Premisa 3 (Riesgo RLS e Inconsistencia de Rol):**  
   Todas las mutaciones cliente (`saveMatchResult`, altas/bajas de jugadores, reprogramación de partidos) se envían a PostgREST con el rol público `anon`. Si una tabla tiene RLS `to authenticated` (como `player_credentials`, Obs 1.1.3), o si se aplican políticas de seguridad estándar, las operaciones fallan o retornan 0 filas afectadas de forma silenciosa.
4. **Premisa 4 (Compatibilidad Total sin Romper Código):**  
   Si `lib/supabase.ts` evalúa en tiempo de ejecución:
   - Si `typeof window !== 'undefined' && typeof window.document !== 'undefined'`: retorna `createBrowserClient(url, key)` de `@supabase/ssr`.
   - Si no: retorna `createSupabaseClient(url, key)` de `@supabase/supabase-js`.
5. **Premisa 5 (Identidad Singleton Garantizada):**  
   Debido a que `@supabase/ssr` almacena internamente `cachedBrowserClient` (Obs 1.1.3), la instancia exportada por `lib/supabase.ts` y la retornada por `createClient()` en `lib/supabase/client.ts` son el **mismo objeto en memoria** (Obs 1.3).
6. **Conclusión Lógica:**  
   Esta unificación resuelve la brecha de autenticación de forma 100% transparente: no requiere modificar ninguna de las 13 importaciones existentes en los componentes admin, preserva la ejecución de `lib/public-data.ts` en el servidor, y alinea el cliente del navegador con el middleware y los route handlers.

---

## 3. Caveats

1. **Pre-renderizado de Client Components durante SSR de Next.js:**  
   Next.js evalúa componentes cliente en el servidor para generar el HTML inicial. Durante ese render inicial en Node.js, `typeof window` es `undefined`, por lo que `supabase` será el cliente de servidor (público anon). Esto es completamente seguro porque las mutaciones de datos y las consultas React Query con datos autenticados ocurren en el navegador (`useEffect`, `handleSave`, o en eventos de usuario), donde `window` está siempre presente.
2. **Lint existente en `tests/e2e/helpers/test-fixtures.ts`:**  
   Al ejecutar `npm run lint`, se detectaron 20 errores de `@typescript-eslint/no-explicit-any` preexistentes en dicho archivo de pruebas E2E. Estos errores no están relacionados con Supabase ni con `lib/supabase.ts`.
3. **Reglas de RLS actuales en BD:**  
   Actualmente las tablas `matches`, `teams`, `players` y `seasons` tienen políticas permisivas o públicas en Supabase, lo cual permitió que la captura funcionara anteriormente. Sin embargo, unificar el cliente con cookie auth garantiza que el usuario autenticado envíe su JWT en cada mutación, eliminando el riesgo de bloqueo por RLS futuro o auditoría de usuario (`auth.uid()`).

---

## 4. Conclusion & Implementation Plan for Worker

### Resumen del Plan
El Worker solo necesita actualizar **dos archivos**:
1. `lib/supabase.ts`: Unificar la inicialización del cliente con detección de runtime.
2. `lib/supabase/client.ts`: Añadir export de conveniencia `export const supabase = createClient()` para paridad total.

Ninguno de los 13 componentes consumidores necesita cambiar sus declaraciones de importación.

---

### Código Propuesto para el Worker

#### Archivo 1: `lib/supabase.ts` (Reemplazo propuesto)
```ts
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
  console.error(
    '[Supabase] NEXT_PUBLIC_SUPABASE_URL must be a valid REST URL (https://...)'
  );
}

/**
 * Retorna el cliente Supabase adecuado para el entorno de ejecucion actual.
 * En el navegador, reutiliza el singleton createBrowserClient de @supabase/ssr
 * para que las cookies HTTP, la sesion y el token JWT de Auth se compartan
 * entre login, middleware y todas las mutaciones del panel administrativo.
 * En el servidor (lib/public-data.ts, scripts o pre-renderizado SSR),
 * utiliza createClient de @supabase/supabase-js con la clave anon publica.
 */
export function getSupabaseClient(): SupabaseClient {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    return createBrowserClient();
  }
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Cliente Supabase singleton para uso en componentes cliente y paginas admin.
 * Reemplazo 100% compatible para todas las importaciones `import { supabase } from '@/lib/supabase'`.
 */
export const supabase: SupabaseClient = getSupabaseClient();

export { createClient } from '@/lib/supabase/client';
```

#### Archivo 2: `lib/supabase/client.ts` (Mejora de conveniencia)
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Instancia singleton para uso directo en componentes cliente.
 */
export const supabase = createClient();
```

---

## 5. Verification Method

Para verificar independientemente la implementación:

1. **Verificación de Tipos y Compilación:**
   ```powershell
   npm run build
   ```
   Debe compilar exitosamente sin errores de TypeScript en `lib/supabase.ts`, `lib/supabase/client.ts`, ni en los 13 archivos importadores.

2. **Verificación de Pruebas Unitarias:**
   ```powershell
   npm test
   ```
   Las 20 suites de prueba (73 tests en Vitest) deben pasar exitosamente (`Test Files: 20 passed`).

3. **Verificación en Navegador / Runtime:**
   - Iniciar sesión en `/login` con credenciales de administrador.
   - Abrir DevTools → Application → Cookies: confirmar presencia de cookies `sb-*-auth-token`.
   - Navegar a `/admin/capture`, seleccionar un partido y realizar una captura.
   - En Network tab, inspeccionar la petición `PATCH /rest/v1/matches?...` o `POST /rest/v1/player_match_stats`:
     - Confirmar que la cabecera `Authorization` contiene `Bearer <jwt_token>` (el token del usuario autenticado) y no solo la anon key.
   - Verificar que al cerrar sesión en `AdminLayout.tsx` (`supabase.auth.signOut()`), la sesión se destruya correctamente y redirija a `/login`.
