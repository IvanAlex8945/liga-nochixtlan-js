import { NextResponse } from 'next/server';

import {
  createVerificationLog,
  loadCredentialViewByCode,
} from '@/lib/credential-verification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code')?.trim().toUpperCase() ?? '';

    if (!code) {
      return NextResponse.json(
        { error: 'Debes proporcionar un código de credencial.' },
        { status: 400 }
      );
    }

    const result = await loadCredentialViewByCode(code);

    if (!result) {
      return NextResponse.json({ credential: null }, { status: 404 });
    }

    await createVerificationLog({
      credentialId: result.credential.id,
      deviceInfo: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for'),
      method: 'manual_code',
      result: result.credential.status === 'active' ? 'valid' : 'revoked',
    });

    return NextResponse.json({ credential: result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudo verificar el código de la credencial.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
