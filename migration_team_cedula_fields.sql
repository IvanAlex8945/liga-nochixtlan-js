-- Campos de contacto para la Cedula de Inscripcion.
-- Es aditivo: no elimina ni modifica registros existentes.

alter table public.teams
  add column if not exists captain_name text,
  add column if not exists captain_phone text;

comment on column public.teams.captain_name is
  'Nombre del capitan o responsable del equipo para cedulas de inscripcion.';

comment on column public.teams.captain_phone is
  'Telefono de contacto del capitan o responsable del equipo para cedulas de inscripcion.';
