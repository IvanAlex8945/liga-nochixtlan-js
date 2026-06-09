import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { buildAccessSnapshot, hasPermission } from '@/lib/access-control';
import {
  buildPlayerPhotoFolder,
  buildPlayerPhotoPublicId,
  getCloudinaryConfig,
  signCloudinaryParams,
} from '@/lib/cloudinary';

export const runtime = 'nodejs';

interface SignUploadBody {
  playerName?: string;
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
        { error: 'No tienes permiso para subir fotos de jugadores.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as SignUploadBody;

    if (!body.playerName || !body.seasonId || !body.teamId) {
      return NextResponse.json(
        { error: 'Faltan datos para preparar la subida de la foto.' },
        { status: 400 }
      );
    }

    const { cloudName, apiKey } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = buildPlayerPhotoFolder(body.seasonId, body.teamId);
    const publicId = buildPlayerPhotoPublicId(body.playerName);
    const paramsToSign = {
      folder,
      public_id: publicId,
      timestamp,
    };

    const signature = signCloudinaryParams(paramsToSign);

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      publicId,
      signature,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudo generar la firma de Cloudinary.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
