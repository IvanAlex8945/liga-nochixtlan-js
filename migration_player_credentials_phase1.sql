-- Fase 1: registro digital de jugadores y credenciales logicas
-- Ejecutar manualmente en el SQL Editor de Supabase.

alter table public.players
  add column if not exists photo_provider text,
  add column if not exists photo_url text,
  add column if not exists photo_thumb_url text,
  add column if not exists photo_public_id text,
  add column if not exists photo_sha256 text,
  add column if not exists registered_by uuid,
  add column if not exists registered_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create or replace function public.set_players_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_players_updated_at on public.players;
create trigger trg_players_updated_at
before update on public.players
for each row
execute function public.set_players_updated_at();

create table if not exists public.player_credentials (
  id uuid primary key default gen_random_uuid(),
  player_id bigint not null references public.players(id) on delete cascade,
  season_id bigint not null references public.seasons(id) on delete cascade,
  version integer not null default 1,
  credential_code text not null unique,
  verify_token uuid not null default gen_random_uuid() unique,
  signed_payload_hash text,
  status text not null default 'active',
  issued_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  revoked_reason text,
  last_rendered_at timestamptz,
  constraint player_credentials_status_check
    check (status in ('active', 'revoked', 'replaced', 'expired'))
);

create index if not exists idx_player_credentials_player_id
  on public.player_credentials(player_id);

create index if not exists idx_player_credentials_season_id
  on public.player_credentials(season_id);

create unique index if not exists idx_player_credentials_active_player
  on public.player_credentials(player_id, season_id)
  where status = 'active';

alter table public.player_credentials enable row level security;

create table if not exists public.credential_verification_logs (
  id bigint generated always as identity primary key,
  credential_id uuid not null references public.player_credentials(id) on delete cascade,
  verified_at timestamptz not null default timezone('utc', now()),
  method text not null,
  result text not null,
  device_info text,
  ip inet,
  notes text,
  constraint credential_verification_logs_method_check
    check (method in ('qr_online', 'manual_code', 'offline_token')),
  constraint credential_verification_logs_result_check
    check (result in ('valid', 'revoked', 'not_found', 'mismatch'))
);

create index if not exists idx_credential_logs_credential_id
  on public.credential_verification_logs(credential_id);

alter table public.credential_verification_logs enable row level security;

drop policy if exists player_credentials_authenticated_select on public.player_credentials;
create policy player_credentials_authenticated_select
  on public.player_credentials
  for select
  to authenticated
  using (true);

drop policy if exists player_credentials_authenticated_insert on public.player_credentials;
create policy player_credentials_authenticated_insert
  on public.player_credentials
  for insert
  to authenticated
  with check (true);

drop policy if exists player_credentials_authenticated_update on public.player_credentials;
create policy player_credentials_authenticated_update
  on public.player_credentials
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists player_credentials_authenticated_delete on public.player_credentials;
create policy player_credentials_authenticated_delete
  on public.player_credentials
  for delete
  to authenticated
  using (true);

drop policy if exists credential_logs_authenticated_select on public.credential_verification_logs;
create policy credential_logs_authenticated_select
  on public.credential_verification_logs
  for select
  to authenticated
  using (true);

drop policy if exists credential_logs_authenticated_insert on public.credential_verification_logs;
create policy credential_logs_authenticated_insert
  on public.credential_verification_logs
  for insert
  to authenticated
  with check (true);

drop policy if exists credential_logs_authenticated_update on public.credential_verification_logs;
create policy credential_logs_authenticated_update
  on public.credential_verification_logs
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists credential_logs_authenticated_delete on public.credential_verification_logs;
create policy credential_logs_authenticated_delete
  on public.credential_verification_logs
  for delete
  to authenticated
  using (true);
