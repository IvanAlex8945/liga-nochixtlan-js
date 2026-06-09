import { createAdminClient } from '@/lib/supabase/admin';

export interface CredentialRecord {
  id: string;
  player_id: number;
  season_id: number;
  version: number;
  credential_code: string;
  verify_token: string;
  status: string;
  issued_at: string;
}

export interface PlayerRecord {
  id: number;
  name: string;
  number: number | null;
  category: string | null;
  photo_url: string | null;
  photo_thumb_url: string | null;
  team_id: number;
}

export interface TeamRecord {
  id: number;
  name: string;
  season_id: number;
}

export interface SeasonRecord {
  id: number;
  name: string;
  category: string | null;
}

export interface CredentialVerificationView {
  credential: CredentialRecord;
  player: PlayerRecord;
  team: TeamRecord | null;
  season: SeasonRecord | null;
}

export async function loadCredentialViewByToken(token: string) {
  const admin = createAdminClient();

  const { data: credential, error: credentialError } = await admin
    .from('player_credentials')
    .select('id, player_id, season_id, version, credential_code, verify_token, status, issued_at')
    .eq('verify_token', token)
    .maybeSingle<CredentialRecord>();

  if (credentialError) {
    throw credentialError;
  }

  if (!credential) {
    return null;
  }

  return loadCredentialRelations(admin, credential);
}

export async function loadCredentialViewByCode(code: string) {
  const admin = createAdminClient();

  const { data: credential, error: credentialError } = await admin
    .from('player_credentials')
    .select('id, player_id, season_id, version, credential_code, verify_token, status, issued_at')
    .eq('credential_code', code)
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle<CredentialRecord>();

  if (credentialError) {
    throw credentialError;
  }

  if (!credential) {
    return null;
  }

  return loadCredentialRelations(admin, credential);
}

export async function createVerificationLog(input: {
  credentialId: string;
  deviceInfo?: string | null;
  ip?: string | null;
  method: 'qr_online' | 'manual_code' | 'offline_token';
  notes?: string | null;
  result: 'valid' | 'revoked' | 'not_found' | 'mismatch';
}) {
  const admin = createAdminClient();

  const { error } = await admin.from('credential_verification_logs').insert({
    credential_id: input.credentialId,
    device_info: input.deviceInfo ?? null,
    ip: input.ip ?? null,
    method: input.method,
    notes: input.notes ?? null,
    result: input.result,
  });

  if (error) {
    throw error;
  }
}

async function loadCredentialRelations(
  admin: ReturnType<typeof createAdminClient>,
  credential: CredentialRecord
): Promise<CredentialVerificationView | null> {
  const { data: player, error: playerError } = await admin
    .from('players')
    .select('id, name, number, category, photo_url, photo_thumb_url, team_id')
    .eq('id', credential.player_id)
    .maybeSingle<PlayerRecord>();

  if (playerError || !player) {
    return null;
  }

  const [{ data: team }, { data: season }] = await Promise.all([
    admin
      .from('teams')
      .select('id, name, season_id')
      .eq('id', player.team_id)
      .maybeSingle<TeamRecord>(),
    admin
      .from('seasons')
      .select('id, name, category')
      .eq('id', credential.season_id)
      .maybeSingle<SeasonRecord>(),
  ]);

  return {
    credential,
    player,
    team: team ?? null,
    season: season ?? null,
  };
}
