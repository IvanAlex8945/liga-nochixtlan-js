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

    if (!user || !hasPermission(access.permissions, 'manage_capture')) {
      return NextResponse.json(
        { error: 'No tienes permiso para consultar credenciales del equipo.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const seasonId = Number(url.searchParams.get('seasonId'));
    const playerIds = url.searchParams
      .getAll('playerId')
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!seasonId || playerIds.length === 0) {
      return NextResponse.json(
        { error: 'Faltan seasonId o playerId para consultar credenciales.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('player_credentials')
      .select('player_id, credential_code, verify_token, status')
      .eq('season_id', seasonId)
      .in('player_id', playerIds)
      .eq('status', 'active');

    if (error) {
      throw error;
    }

    return NextResponse.json({ credentials: data ?? [] });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudieron consultar las credenciales del equipo.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
