# Resumen de Seguridad Implementada

El panel de administracion usa autenticacion de Supabase y proteccion de rutas para restringir el acceso a `/admin` y sus subrutas.

## Cuentas de Acceso

Las cuentas administrativas oficiales existen en Supabase Auth, pero las contrasenas ya no deben almacenarse en este repositorio ni en archivos locales de documentacion.

Para consultar o rotar accesos:

1. Entra a Supabase.
2. Abre `Authentication`.
3. Revisa los usuarios administradores activos.
4. Cambia o restablece contrasenas desde el panel seguro de Supabase.

## Script de Alta de Administradores

El script [scripts/createAdmins.mjs](/D:/liga-nochixtlan-js/scripts/createAdmins.mjs:1) ya no incluye contrasenas fijas.

Uso esperado:

```powershell
$env:ADMIN_DEFAULT_PASSWORD="tu_password_seguro"
node scripts/createAdmins.mjs <service_role_key>
```

## Recomendaciones

- No guardar contrasenas reales en Markdown, scripts o commits.
- Rotar inmediatamente cualquier clave que haya vivido antes en texto plano.
- Usar el panel de Supabase para cambios rutinarios de acceso.
