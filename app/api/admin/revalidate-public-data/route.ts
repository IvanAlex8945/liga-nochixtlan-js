import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { buildAccessSnapshot } from '@/lib/access-control';
import {
  getPublicSeasonTag,
  PUBLIC_SEASONS_TAG,
} from '@/lib/public-cache-keys';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const CACHE_INVALIDATION_PERMISSIONS = new Set([
  'manage_seasons',
  'manage_teams',
  'manage_calendar',
  'manage_capture',
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = buildAccessSnapshot(user?.email);

  if (
    !user
    || !access.permissions.some((permission) =>
      CACHE_INVALIDATION_PERMISSIONS.has(permission)
    )
  ) {
    return NextResponse.json(
      { error: 'No tienes permiso para actualizar el caché público.' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({})) as {
    seasonId?: unknown;
    seasons?: unknown;
  };
  const seasonId = Number(body.seasonId);
  const invalidateSeasons = body.seasons === true;

  if (!invalidateSeasons && (!Number.isSafeInteger(seasonId) || seasonId <= 0)) {
    return NextResponse.json(
      { error: 'Debes indicar una temporada válida.' },
      { status: 400 }
    );
  }

  const tags: string[] = [];

  if (Number.isSafeInteger(seasonId) && seasonId > 0) {
    const seasonTag = getPublicSeasonTag(seasonId);
    revalidateTag(seasonTag, { expire: 0 });
    tags.push(seasonTag);
  }

  if (invalidateSeasons) {
    revalidateTag(PUBLIC_SEASONS_TAG, { expire: 0 });
    tags.push(PUBLIC_SEASONS_TAG);
  }

  console.info(JSON.stringify({
    event: 'public_cache_invalidated',
    tags,
    userId: user.id,
  }));

  return NextResponse.json({ revalidated: true, tags });
}
