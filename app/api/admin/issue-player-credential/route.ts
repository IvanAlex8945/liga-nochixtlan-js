import { NextResponse } from 'next/server';

import { buildAccessSnapshot, hasPermission } from '@/lib/access-control';
import { generateCredentialCode } from '@/lib/player-credentials';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface EnsureCredentialBody {
  playerId?: number;
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
        { error: 'No tienes permiso para emitir credenciales.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as EnsureCredentialBody;

    if (!body.playerId || !body.seasonId) {
      return NextResponse.json(
        { error: 'Faltan datos para emitir la credencial.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin
      .from('player_credentials')
      .select('id, player_id, season_id, version, credential_code, status, issued_at')
      .eq('player_id', body.playerId)
      .eq('season_id', body.seasonId)
      .eq('status', 'active')
      .order('issued_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return NextResponse.json({ credential: existing, created: false });
    }

    let attempts = 0;

    while (attempts < 3) {
      const { data: created, error } = await admin
        .from('player_credentials')
        .insert({
          player_id: body.playerId,
          season_id: body.seasonId,
          version: 1,
          credential_code: generateCredentialCode('LNN'),
          status: 'active',
        })
        .select('id, player_id, season_id, version, credential_code, status, issued_at')
        .single();

      if (!error) {
        return NextResponse.json({ credential: created, created: true });
      }

      attempts += 1;

      if (error.code !== '23505') {
        throw error;
      }
    }

    return NextResponse.json(
      { error: 'No se pudo generar un codigo unico para la credencial.' },
      { status: 500 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudo asegurar la credencial del jugador.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
