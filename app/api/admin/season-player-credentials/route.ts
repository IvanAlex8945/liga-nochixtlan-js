import { NextResponse } from 'next/server';

import { buildAccessSnapshot, hasPermission } from '@/lib/access-control';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        {
          status: 403,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          },
        }
      );
    }

    const url = new URL(request.url);
    const seasonId = Number(url.searchParams.get('seasonId'));

    if (!seasonId) {
      return NextResponse.json(
        { error: 'Falta seasonId para consultar credenciales.' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          },
        }
      );
    }

    const admin = createAdminClient();

    // 1. Obtener equipos de la temporada
    const { data: seasonTeams, error: teamsError } = await admin
      .from('teams')
      .select('id')
      .eq('season_id', seasonId);

    if (teamsError) {
      throw teamsError;
    }

    const teamIds = (seasonTeams ?? []).map((t) => t.id);

    // 2. Consultar credenciales activas y jugadores frescos en paralelo con el cliente admin
    const [{ data: credentials, error: credsError }, { data: players, error: playersError }] =
      await Promise.all([
        admin
          .from('player_credentials')
          .select('id, player_id, season_id, version, credential_code, verify_token, status, issued_at')
          .eq('season_id', seasonId)
          .eq('status', 'active')
          .order('issued_at', { ascending: false }),
        teamIds.length > 0
          ? admin
              .from('players')
              .select('*')
              .in('team_id', teamIds)
              .order('name')
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (credsError) {
      throw credsError;
    }
    if (playersError) {
      throw playersError;
    }

    return NextResponse.json(
      {
        credentials: credentials ?? [],
        players: players ?? [],
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudieron consultar las credenciales.';

    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  }
}
