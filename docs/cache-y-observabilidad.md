# Caché público y medición de consultas

## Qué se almacena

- La lista de temporadas activas se conserva durante 5 minutos.
- Los equipos, jugadores, partidos y estadísticas se almacenan por temporada.
- Cada temporada tiene una etiqueta independiente: `public-season:<id>`.
- El navegador conserva las temporadas que el usuario ya abrió durante su visita.

Cuando se modifica una temporada desde Captura, Calendario, Equipos o Temporadas,
la aplicación invalida únicamente la información afectada. El tiempo de 5 minutos
queda como respaldo si una invalidación no pudiera ejecutarse.

## Cómo contar solicitudes de usuarios

En Vercel:

1. Abrir el proyecto `liga-nochixtlan-js`.
2. Entrar a **Observability**.
3. Seleccionar el entorno **Production**.
4. Elegir el rango **Last 24 hours** o **Last 7 days**.
5. Visualizar `Count` y agrupar por `request_path`.
6. Revisar principalmente `/` y `/api/public/season-data`.

Esto cuenta solicitudes web. No equivale directamente a consultas de base de datos.

## Cómo contar accesos reales a Supabase

Los accesos públicos que llegan realmente a Supabase generan este registro:

```text
"event":"supabase_public_cache_miss"
```

En **Vercel > Logs**, buscar ese texto y elegir el rango diario o semanal.

- `resource: "active_seasons"` representa 1 consulta.
- `resource: "season_data"` representa normalmente 4 consultas.
- El campo `supabaseQueries` contiene el número estimado del lote.

También puede revisarse en Supabase:

1. **Observability / Reports** para solicitudes y rendimiento.
2. **Logs Explorer** para las rutas más solicitadas.
3. **Advisors > Query Performance** para las consultas más frecuentes.

No se guarda una fila de analítica por visita en Supabase, porque hacerlo aumentaría
el consumo que precisamente se busca reducir.
