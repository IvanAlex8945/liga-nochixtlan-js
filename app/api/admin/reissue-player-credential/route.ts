import { NextResponse } from 'next/server';

import { buildAccessSnapshot, hasPermission } from '@/lib/access-control';
import { generateCredentialCode } from '@/lib/player-credentials';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface ReissueCredentialBody {
  playerId?: number;
  reason?: string;
  seasonId?: number;
}

async function insertCredentialWithRetry(playerId: number, seasonId: number, version: number) {
  const admin = createAdminClient();
  let attempts = 0;

  while (attempts < 3) {
    const { data: created, error } = await admin
      .from('player_credentials')
      .insert({
        player_id: playerId,
        season_id: seasonId,
        version,
        credential_code: generateCredentialCode('LNN'),
        status: 'active',
      })
      .select('id, player_id, season_id, version, credential_code, verify_token, status, issued_at')
      .single();

    if (!error) {
      return created;
    }

    attempts += 1;

    if (error.code !== '23505') {
      throw error;
    }
  }

  throw new Error('No se pudo generar un codigo unico para la nueva credencial.');
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const access = buildAccessSnapshot(user?.email);

    if (!user || !hasPermission(access.permissions, 'manage_teams')) {
      return NextResponse.json(
        { error: 'No tienes permiso para reemitir credenciales.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as ReissueCredentialBody;

    if (!body.playerId || !body.seasonId) {
      return NextResponse.json(
        { error: 'Faltan datos para reemitir la credencial.' },
        { status: 400 }
      );
    }

    const reason = body.reason?.trim() || 'Datos actualizados';
    const admin = createAdminClient();

    const { data: latestCredentials, error: latestError } = await admin
      .from('player_credentials')
      .select('id, version, status')
      .eq('player_id', body.playerId)
      .eq('season_id', body.seasonId)
      .order('version', { ascending: false });

    if (latestError) {
      throw latestError;
    }

    const activeCredential = latestCredentials?.find((credential) => credential.status === 'active') ?? null;
    const nextVersion = Math.max(...(latestCredentials ?? []).map((credential) => credential.version), 0) + 1;

    if (activeCredential) {
      const { error: replaceError } = await admin
        .from('player_credentials')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_reason: reason,
          status: 'replaced',
        })
        .eq('id', activeCredential.id);

      if (replaceError) {
        throw replaceError;
      }
    }

    const created = await insertCredentialWithRetry(body.playerId, body.seasonId, nextVersion);

    return NextResponse.json({
      credential: created,
      previousCredentialId: activeCredential?.id ?? null,
      replaced: Boolean(activeCredential),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo reemitir la credencial del jugador.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
