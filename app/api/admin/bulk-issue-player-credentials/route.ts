import { NextResponse } from 'next/server';

import { buildAccessSnapshot, hasPermission } from '@/lib/access-control';
import { generateCredentialCode } from '@/lib/player-credentials';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface BulkIssueBody {
  seasonId?: number;
  teamId?: number;
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
        { error: 'No tienes permiso para emitir credenciales masivas.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as BulkIssueBody;

    if (!body.seasonId) {
      return NextResponse.json(
        { error: 'Falta la temporada para emitir credenciales.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    let teamsQuery = admin
      .from('teams')
      .select('id, name')
      .eq('season_id', body.seasonId)
      .order('name');

    if (body.teamId) {
      teamsQuery = teamsQuery.eq('id', body.teamId);
    }

    const { data: teams, error: teamsError } = await teamsQuery;

    if (teamsError) {
      throw teamsError;
    }

    if (!teams || teams.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron equipos para esta emision.' },
        { status: 404 }
      );
    }

    const teamIds = teams.map((team) => team.id);
    const scopeLabel = body.teamId ? teams[0].name : 'toda la temporada';

    const { data: players, error: playersError } = await admin
      .from('players')
      .select('id, team_id')
      .in('team_id', teamIds)
      .eq('is_active', true);

    if (playersError) {
      throw playersError;
    }

    const eligiblePlayers = players ?? [];

    if (eligiblePlayers.length === 0) {
      return NextResponse.json({
        eligibleCount: 0,
        issuedCount: 0,
        scopeLabel,
        skippedCount: 0,
      });
    }

    const playerIds = eligiblePlayers.map((player) => player.id);
    const { data: existingCredentials, error: existingError } = await admin
      .from('player_credentials')
      .select('player_id')
      .eq('season_id', body.seasonId)
      .eq('status', 'active')
      .in('player_id', playerIds);

    if (existingError) {
      throw existingError;
    }

    const existingPlayerIds = new Set(
      (existingCredentials ?? []).map((credential) => credential.player_id)
    );
    const missingPlayers = eligiblePlayers.filter((player) => !existingPlayerIds.has(player.id));

    let issuedCount = 0;

    for (const player of missingPlayers) {
      let attempts = 0;

      while (attempts < 4) {
        const { error } = await admin.from('player_credentials').insert({
          player_id: player.id,
          season_id: body.seasonId,
          version: 1,
          credential_code: generateCredentialCode('LNN'),
          status: 'active',
        });

        if (!error) {
          issuedCount += 1;
          break;
        }

        attempts += 1;

        if (error.code !== '23505') {
          throw error;
        }
      }
    }

    return NextResponse.json({
      eligibleCount: eligiblePlayers.length,
      issuedCount,
      scopeLabel,
      skippedCount: eligiblePlayers.length - missingPlayers.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudieron emitir las credenciales pendientes.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
