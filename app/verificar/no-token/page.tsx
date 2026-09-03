import Image from 'next/image';
import Link from 'next/link';

import { formatPlayerNumber } from '@/lib/player-number';
import {
  createVerificationLog,
  loadCredentialViewByCode,
  type CredentialVerificationView,
} from '@/lib/credential-verification';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ManualLookupPageProps {
  searchParams?: Promise<{ code?: string }>;
}

export default async function ManualLookupPage({ searchParams }: ManualLookupPageProps) {
  const query = (await searchParams) ?? {};
  const code = query.code?.trim().toUpperCase() ?? '';
  const view = code ? await loadCredentialViewByCode(code) : null;

  if (view) {
    await createVerificationLog({
      credentialId: view.credential.id,
      deviceInfo: null,
      ip: null,
      method: 'manual_code',
      result: view.credential.status === 'active' ? 'valid' : 'revoked',
    }).catch(() => undefined);
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <h1 style={titleStyle}>Búsqueda manual de credencial</h1>
        <p style={helperStyle}>
          Usa este modo cuando el QR no se pueda escanear. El resultado debe coincidir con la credencial mostrada por el jugador.
        </p>

        <form method="GET" style={formStyle}>
          <input
            name="code"
            defaultValue={code}
            placeholder="LNN-XXXXXXX"
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>
            Buscar
          </button>
        </form>

        {view ? <ManualResult view={view} /> : <EmptyState code={code} />}

        <Link href="/" style={linkStyle}>
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}

function ManualResult({ view }: { view: CredentialVerificationView }) {
  const active = view.credential.status === 'active';

  return (
    <div style={resultCardStyle}>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={photoShellStyle}>
          {view.player.photo_thumb_url || view.player.photo_url ? (
            <Image
              src={view.player.photo_thumb_url ?? view.player.photo_url ?? ''}
              alt={`Foto de ${view.player.name}`}
              fill
              unoptimized
              sizes="140px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div style={fallbackPhotoStyle}>{getInitials(view.player.name)}</div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={active ? okBadgeStyle : errorBadgeStyle}>
            {active ? 'Credencial válida' : 'Credencial no vigente'}
          </div>
          <h2 style={{ color: '#fff', margin: '10px 0 8px', fontSize: 30 }}>{view.player.name}</h2>
          <p style={{ margin: 0, color: 'rgba(245,241,232,0.74)' }}>
            {view.team?.name ?? 'Equipo sin asignar'} · {view.player.number !== null ? `#${formatPlayerNumber(view.player.number)}` : 'Sin dorsal'}
          </p>
          <p style={{ margin: '8px 0 0', color: 'rgba(245,241,232,0.74)' }}>
            Código: {view.credential.credential_code}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ code }: { code: string }) {
  return (
    <div style={emptyCardStyle}>
      <h2 style={{ color: '#fff', marginTop: 0 }}>
        {code ? 'No se encontró ese código' : 'Captura un código'}
      </h2>
      <p style={{ ...helperStyle, marginBottom: 0 }}>
        {code
          ? 'Verifica que el código esté completo y sin espacios. Si sigue sin aparecer, la credencial podría estar revocada o mal capturada.'
          : 'Escribe el código visible de la credencial para hacer la consulta manual.'}
      </p>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('');
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 18,
  background:
    'radial-gradient(circle at top, rgba(250,173,20,0.22), transparent 28%), linear-gradient(180deg, #11131a 0%, #07080b 100%)',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 840,
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  borderRadius: 32,
  border: '1px solid rgba(247, 215, 116, 0.18)',
  background: 'rgba(9, 12, 18, 0.88)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.46)',
  padding: 24,
};

const titleStyle: React.CSSProperties = {
  color: '#fff',
  margin: 0,
  fontSize: 34,
};

const helperStyle: React.CSSProperties = {
  color: 'rgba(245, 241, 232, 0.72)',
  margin: 0,
  lineHeight: 1.6,
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
};

const inputStyle: React.CSSProperties = {
  flex: '1 1 260px',
  minHeight: 46,
  borderRadius: 16,
  border: '1px solid rgba(247,215,116,0.16)',
  background: 'rgba(12,16,23,0.84)',
  color: '#fff',
  padding: '0 14px',
  fontSize: 15,
};

const buttonStyle: React.CSSProperties = {
  minHeight: 46,
  borderRadius: 16,
  border: '1px solid rgba(247,215,116,0.16)',
  background: '#f7d774',
  color: '#11131a',
  padding: '0 18px',
  fontWeight: 800,
  cursor: 'pointer',
};

const resultCardStyle: React.CSSProperties = {
  borderRadius: 24,
  border: '1px solid rgba(247,215,116,0.14)',
  background: 'rgba(255,255,255,0.04)',
  padding: 18,
};

const emptyCardStyle: React.CSSProperties = {
  borderRadius: 24,
  border: '1px solid rgba(255,77,79,0.16)',
  background: 'rgba(255,77,79,0.08)',
  padding: 18,
};

const photoShellStyle: React.CSSProperties = {
  position: 'relative',
  width: 140,
  height: 140,
  borderRadius: 22,
  overflow: 'hidden',
  border: '1px solid rgba(247,215,116,0.16)',
  background: 'rgba(255,255,255,0.05)',
};

const fallbackPhotoStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#f7d774',
  fontSize: 44,
  fontWeight: 700,
};

const okBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '8px 14px',
  borderRadius: 999,
  border: '1px solid rgba(82,196,26,0.3)',
  background: 'rgba(82,196,26,0.14)',
  color: '#dfffe4',
  fontWeight: 700,
};

const errorBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '8px 14px',
  borderRadius: 999,
  border: '1px solid rgba(255,77,79,0.3)',
  background: 'rgba(255,77,79,0.14)',
  color: '#ffe0dc',
  fontWeight: 700,
};

const linkStyle: React.CSSProperties = {
  color: '#f7d774',
  fontWeight: 700,
  textDecoration: 'none',
};
