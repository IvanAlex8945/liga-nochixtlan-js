import { NextResponse } from 'next/server';

import { buildAccessSnapshot, hasPermission } from '@/lib/access-control';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const access = buildAccessSnapshot(user?.email);

    if (!user || !hasPermission(access.permissions, 'manage_teams')) {
      return NextResponse.json(
        { error: 'No tienes permiso para consultar credenciales.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const playerId = Number(url.searchParams.get('playerId'));
    const seasonId = Number(url.searchParams.get('seasonId'));

    if (!playerId || !seasonId) {
      return NextResponse.json(
        { error: 'Faltan playerId o seasonId.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('player_credentials')
      .select('id, player_id, season_id, version, credential_code, verify_token, status, issued_at')
      .eq('player_id', playerId)
      .eq('season_id', seasonId)
      .eq('status', 'active')
      .order('issued_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({ credential: data ?? null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo consultar la credencial del jugador.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
