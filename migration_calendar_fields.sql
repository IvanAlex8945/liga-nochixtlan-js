-- migration_calendar_fields.sql
-- Añade columnas para el generador automático de calendario

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS court text,
ADD COLUMN IF NOT EXISTS time_str text;
