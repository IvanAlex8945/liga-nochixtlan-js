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
    const seasonId = Number(url.searchParams.get('seasonId'));

    if (!seasonId) {
      return NextResponse.json(
        { error: 'Falta seasonId para consultar credenciales.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('player_credentials')
      .select('id, player_id, season_id, version, credential_code, verify_token, status, issued_at')
      .eq('season_id', seasonId)
      .eq('status', 'active')
      .order('issued_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ credentials: data ?? [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudieron consultar las credenciales.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
