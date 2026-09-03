import { NextResponse } from 'next/server';

import { getCachedPublicSeasonData } from '@/lib/public-data';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seasonId = Number(url.searchParams.get('seasonId'));

  if (!Number.isSafeInteger(seasonId) || seasonId <= 0) {
    return NextResponse.json(
      { error: 'La temporada solicitada no es válida.' },
      { status: 400 }
    );
  }

  try {
    console.info(JSON.stringify({
      event: 'public_season_data_request',
      seasonId,
    }));

    const data = await getCachedPublicSeasonData(seasonId);

    return NextResponse.json(data, {
      headers: {
        // El cliente ya conserva temporadas consultadas. Evitar cachear esta
        // respuesta en CDN impide entregar datos anteriores tras una captura,
        // mientras el Data Cache evita repetir consultas a Supabase.
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'No se pudieron cargar los datos de la temporada.' },
      { status: 500 }
    );
  }
}
