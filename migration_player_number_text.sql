alter table public.players
  alter column number type text using number::text;
