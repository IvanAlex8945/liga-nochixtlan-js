-- CURP para jugadores de la categoria Veteranos.
-- Es aditivo: no modifica ni elimina los registros existentes.

alter table public.players
  add column if not exists curp text;

alter table public.players
  drop constraint if exists players_curp_format_check;

alter table public.players
  add constraint players_curp_format_check
  check (
    curp is null
    or curp ~ '^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$'
  );

create unique index if not exists idx_players_curp_unique
  on public.players (curp)
  where curp is not null;

comment on column public.players.curp is
  'CURP normalizada en mayusculas. Requerida por la aplicacion para Veteranos.';
