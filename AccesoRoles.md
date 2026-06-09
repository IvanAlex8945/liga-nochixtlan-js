# Control de Acceso Local

Este proyecto ahora puede probar roles y permisos en entorno local sin empujar nada a produccion.

## Donde se controla

- Archivo principal: `lib/access-control.ts`
- Pantalla de referencia: `/admin/access`
- Pantalla de bloqueo: `/no-access`

## Roles actuales

- `super_admin`
  - Acceso total.
- `registro_equipos`
  - Solo equipos y jugadores.
- `programacion`
  - Solo calendario.
- `captura_resultados`
  - Solo captura de resultados y consulta de elegibilidad.

## Asignacion local por correo

La prueba local se hace por correo autenticado en Supabase Auth.

Ejemplo base:

- `admin1@liganochixtlan.com` → `super_admin`
- `admin2@liganochixtlan.com` → `registro_equipos`
- `admin3@liganochixtlan.com` → `programacion`
- `captura@liganochixtlan.com` → `captura_resultados`

## Override sin cambiar codigo

Tambien puedes usar:

```powershell
$env:ADMIN_ROLE_OVERRIDES_JSON='{"captura@liganochixtlan.com":"captura_resultados"}'
```

## Ruta para produccion

Cuando se decida pasar a produccion, la idea es mantener el mismo contrato del codigo y solo cambiar la fuente del rol:

1. Crear tabla de perfiles/roles en Supabase.
2. Leer el rol real desde base de datos en lugar del mapa local.
3. Mantener el resto del panel, middleware y vistas igual.
