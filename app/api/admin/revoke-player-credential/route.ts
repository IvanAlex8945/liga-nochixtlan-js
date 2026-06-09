import { NextResponse } from 'next/server';

import { buildAccessSnapshot, hasPermission } from '@/lib/access-control';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface RevokeCredentialBody {
  playerId?: number;
  reason?: string;
  seasonId?: number;
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
        { error: 'No tienes permiso para revocar credenciales.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as RevokeCredentialBody;

    if (!body.playerId || !body.seasonId) {
      return NextResponse.json(
        { error: 'Faltan datos para revocar la credencial.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: activeCredential, error: activeError } = await admin
      .from('player_credentials')
      .select('id, player_id, season_id, version, credential_code, verify_token, status, issued_at')
      .eq('player_id', body.playerId)
      .eq('season_id', body.seasonId)
      .eq('status', 'active')
      .order('issued_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeError) {
      throw activeError;
    }

    if (!activeCredential) {
      return NextResponse.json({ revoked: false, credential: null });
    }

    const { error: revokeError } = await admin
      .from('player_credentials')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: body.reason?.trim() || 'Jugador inactivo',
        status: 'revoked',
      })
      .eq('id', activeCredential.id);

    if (revokeError) {
      throw revokeError;
    }

    return NextResponse.json({
      revoked: true,
      credential: {
        ...activeCredential,
        status: 'revoked',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo revocar la credencial del jugador.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
