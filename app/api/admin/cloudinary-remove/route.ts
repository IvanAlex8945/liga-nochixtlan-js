import { NextResponse } from 'next/server';

import { buildAccessSnapshot, hasPermission } from '@/lib/access-control';
import { getCloudinaryConfig, signCloudinaryParams } from '@/lib/cloudinary';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface DeleteAssetBody {
  publicId?: string;
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
        { error: 'No tienes permiso para eliminar fotos de jugadores.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as DeleteAssetBody;

    if (!body.publicId) {
      return NextResponse.json(
        { error: 'Falta el identificador de la foto a eliminar.' },
        { status: 400 }
      );
    }

    const { cloudName, apiKey } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signCloudinaryParams({
      public_id: body.publicId,
      timestamp,
    });

    const formData = new FormData();
    formData.append('public_id', body.publicId);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const contentType = response.headers.get('content-type') ?? '';

    if (!response.ok) {
      const payload = contentType.includes('application/json')
        ? JSON.stringify(await response.json())
        : await response.text();

      return NextResponse.json(
        { error: `Cloudinary rechazo la eliminacion: ${payload}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudo eliminar la foto en Cloudinary.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
