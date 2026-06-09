import Image from 'next/image';
import Link from 'next/link';

import {
  createVerificationLog,
  loadCredentialViewByCode,
  loadCredentialViewByToken,
  type CredentialVerificationView,
} from '@/lib/credential-verification';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ code?: string }>;
}

export default async function VerifyCredentialPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const query = (await searchParams) ?? {};
  const manualCode = query.code?.trim().toUpperCase() ?? '';

  const [tokenView, codeView] = await Promise.all([
    loadCredentialViewByToken(token),
    manualCode ? loadCredentialViewByCode(manualCode) : Promise.resolve(null),
  ]);

  if (tokenView) {
    await createVerificationLog({
      credentialId: tokenView.credential.id,
      deviceInfo: null,
      ip: null,
      method: 'qr_online',
      result: tokenView.credential.status === 'active' ? 'valid' : 'revoked',
    }).catch(() => undefined);
  }

  const activeView = tokenView ?? null;
  const codeMismatch =
    !!manualCode &&
    !!activeView &&
    !!codeView &&
    codeView.credential.id !== activeView.credential.id;

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={headerStackStyle}>
          <StatusBanner
            title={
              activeView
                ? activeView.credential.status === 'active'
                  ? 'Credencial válida'
                  : 'Credencial no vigente'
                : 'Credencial no localizada'
            }
            tone={activeView?.credential.status === 'active' ? 'valid' : 'invalid'}
          />
          <p style={helperStyle}>
            Esta pantalla está pensada para árbitros o delegados. Verifica rostro, equipo y número antes de autorizar al jugador.
          </p>
        </div>

        <ManualCodeSearch defaultCode={manualCode} />

        {activeView ? (
          <>
            <CredentialHero view={activeView} />
            <ComparisonNotice codeMismatch={codeMismatch} codeView={codeView} />
            <div style={gridStyle}>
              <InfoTile label="Equipo" value={activeView.team?.name ?? 'Sin equipo'} />
              <InfoTile
                label="Número"
                value={activeView.player.number !== null ? `#${activeView.player.number}` : 'Sin dorsal'}
              />
              <InfoTile
                label="Temporada"
                value={activeView.season?.name ?? 'Sin temporada'}
              />
              <InfoTile
                label="Código"
                value={activeView.credential.credential_code}
              />
              <InfoTile
                label="Versión"
                value={`v${activeView.credential.version}`}
              />
              <InfoTile
                label="Emitida"
                value={formatDate(activeView.credential.issued_at)}
              />
            </div>

            <VerificationChecklist />
          </>
        ) : (
          <EmptyVerificationState />
        )}

        <Link href="/" style={linkStyle}>
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}

function ManualCodeSearch({ defaultCode }: { defaultCode: string }) {
  return (
    <form method="GET" style={searchFormStyle}>
      <label htmlFor="code" style={searchLabelStyle}>
        Buscar por código visible
      </label>
      <div style={searchRowStyle}>
        <input
          id="code"
          name="code"
          defaultValue={defaultCode}
          placeholder="LNN-XXXXXXX"
          style={searchInputStyle}
        />
        <button type="submit" style={searchButtonStyle}>
          Buscar
        </button>
      </div>
      <p style={searchHintStyle}>
        Úsalo si el QR no abre o si quieres confirmar que la credencial mostrada coincide con el código impreso.
      </p>
    </form>
  );
}

function CredentialHero({ view }: { view: CredentialVerificationView }) {
  return (
    <div style={heroStyle}>
      <div style={photoShellStyle}>
        {view.player.photo_thumb_url || view.player.photo_url ? (
          <Image
            src={view.player.photo_thumb_url ?? view.player.photo_url ?? ''}
            alt={`Foto de ${view.player.name}`}
            fill
            unoptimized
            sizes="180px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div style={fallbackPhotoStyle}>{getInitials(view.player.name)}</div>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <p style={eyebrowStyle}>Verificación de identidad</p>
        <h1 style={titleStyle}>{view.player.name}</h1>
        <p style={helperStyle}>
          {view.team?.name ?? 'Equipo sin asignar'} · {view.player.category ?? view.season?.category ?? 'Categoría no definida'}
        </p>
        <div style={heroPillsStyle}>
          <Pill value={view.credential.status === 'active' ? 'VIGENTE' : view.credential.status.toUpperCase()} tone={view.credential.status === 'active' ? 'valid' : 'invalid'} />
          <Pill value={view.player.number !== null ? `#${view.player.number}` : 'SIN DORSAL'} tone="neutral" />
          <Pill value={view.credential.credential_code} tone="neutral" />
        </div>
      </div>
    </div>
  );
}

function ComparisonNotice({
  codeMismatch,
  codeView,
}: {
  codeMismatch: boolean;
  codeView: CredentialVerificationView | null;
}) {
  if (!codeView) {
    return null;
  }

  if (codeMismatch) {
    return (
      <div style={dangerNoticeStyle}>
        El código buscado pertenece a otra credencial distinta al QR escaneado. Considera la credencial inválida y revisa con la mesa de control.
      </div>
    );
  }

  return (
    <div style={safeNoticeStyle}>
      El código manual coincide con la credencial mostrada.
    </div>
  );
}

function VerificationChecklist() {
  return (
    <div style={checklistStyle}>
      <h2 style={sectionTitleStyle}>Checklist rápido en cancha</h2>
      <ul style={listStyle}>
        <li>Compara la foto con el jugador presente.</li>
        <li>Confirma que el número de jersey coincide.</li>
        <li>Verifica que equipo y categoría sean correctos.</li>
        <li>Si algo no coincide, no autorices la participación hasta revisar en mesa.</li>
      </ul>
    </div>
  );
}

function EmptyVerificationState() {
  return (
    <div style={emptyStateStyle}>
      <h2 style={sectionTitleStyle}>No se encontró la credencial</h2>
      <p style={helperStyle}>
        El QR puede estar dañado, revocado o pertenecer a una credencial ya retirada. Si tienes el código visible, úsalo arriba para una búsqueda manual.
      </p>
    </div>
  );
}

function StatusBanner({
  title,
  tone,
}: {
  title: string;
  tone: 'valid' | 'invalid';
}) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: '18px 20px',
        color: tone === 'valid' ? '#dfffe4' : '#ffe4de',
        background:
          tone === 'valid'
            ? 'linear-gradient(135deg, rgba(82,196,26,0.22), rgba(82,196,26,0.08))'
            : 'linear-gradient(135deg, rgba(255,77,79,0.22), rgba(255,77,79,0.08))',
        border: `1px solid ${tone === 'valid' ? 'rgba(82,196,26,0.28)' : 'rgba(255,77,79,0.28)'}`,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.08 }}>{title}</div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={tileStyle}>
      <div style={tileLabelStyle}>{label}</div>
      <div style={tileValueStyle}>{value}</div>
    </div>
  );
}

function Pill({
  tone,
  value,
}: {
  tone: 'valid' | 'invalid' | 'neutral';
  value: string;
}) {
  const styles =
    tone === 'valid'
      ? {
          color: '#dfffe4',
          borderColor: 'rgba(82,196,26,0.32)',
          background: 'rgba(82,196,26,0.14)',
        }
      : tone === 'invalid'
        ? {
            color: '#ffe0dc',
            borderColor: 'rgba(255,77,79,0.32)',
            background: 'rgba(255,77,79,0.14)',
          }
        : {
            color: '#f7d774',
            borderColor: 'rgba(247,215,116,0.2)',
            background: 'rgba(255,255,255,0.05)',
          };

  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '8px 14px',
        borderRadius: 999,
        border: `1px solid ${styles.borderColor}`,
        background: styles.background,
        color: styles.color,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.05em',
      }}
    >
      {value}
    </span>
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
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
  maxWidth: 920,
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  borderRadius: 32,
  border: '1px solid rgba(247, 215, 116, 0.18)',
  background: 'rgba(9, 12, 18, 0.88)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.46)',
  padding: 24,
};

const headerStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const heroStyle: React.CSSProperties = {
  display: 'flex',
  gap: 20,
  alignItems: 'center',
  flexWrap: 'wrap',
};

const photoShellStyle: React.CSSProperties = {
  position: 'relative',
  width: 180,
  height: 180,
  borderRadius: 28,
  overflow: 'hidden',
  border: '1px solid rgba(247, 215, 116, 0.16)',
  background: 'rgba(255,255,255,0.05)',
};

const fallbackPhotoStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#f7d774',
  fontSize: 54,
  fontWeight: 700,
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: '#f7d774',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const titleStyle: React.CSSProperties = {
  margin: '8px 0 10px',
  color: '#fff',
  fontSize: 38,
  lineHeight: 1.02,
};

const helperStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(245, 241, 232, 0.72)',
  fontSize: 15,
  lineHeight: 1.55,
};

const heroPillsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 12,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 14,
};

const tileStyle: React.CSSProperties = {
  borderRadius: 18,
  border: '1px solid rgba(247, 215, 116, 0.12)',
  background: 'rgba(255,255,255,0.05)',
  padding: 16,
};

const tileLabelStyle: React.CSSProperties = {
  color: 'rgba(245, 241, 232, 0.58)',
  fontSize: 12,
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const tileValueStyle: React.CSSProperties = {
  color: '#fff',
  fontSize: 18,
  fontWeight: 700,
};

const checklistStyle: React.CSSProperties = {
  borderRadius: 22,
  padding: 18,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(247,215,116,0.12)',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 10px',
  color: '#fff',
  fontSize: 22,
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  color: 'rgba(245, 241, 232, 0.82)',
  lineHeight: 1.7,
};

const emptyStateStyle: React.CSSProperties = {
  borderRadius: 22,
  padding: 18,
  background: 'rgba(255,77,79,0.08)',
  border: '1px solid rgba(255,77,79,0.18)',
};

const linkStyle: React.CSSProperties = {
  color: '#f7d774',
  fontWeight: 700,
  textDecoration: 'none',
};

const searchFormStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 18,
  borderRadius: 22,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(247,215,116,0.12)',
};

const searchLabelStyle: React.CSSProperties = {
  color: '#f7d774',
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const searchRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
};

const searchInputStyle: React.CSSProperties = {
  flex: '1 1 240px',
  minHeight: 46,
  borderRadius: 16,
  border: '1px solid rgba(247,215,116,0.16)',
  background: 'rgba(12,16,23,0.84)',
  color: '#fff',
  padding: '0 14px',
  fontSize: 15,
};

const searchButtonStyle: React.CSSProperties = {
  minHeight: 46,
  borderRadius: 16,
  border: '1px solid rgba(247,215,116,0.16)',
  background: '#f7d774',
  color: '#11131a',
  padding: '0 18px',
  fontWeight: 800,
  cursor: 'pointer',
};

const searchHintStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(245, 241, 232, 0.62)',
  fontSize: 13,
  lineHeight: 1.5,
};

const dangerNoticeStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: 16,
  background: 'rgba(255,77,79,0.1)',
  border: '1px solid rgba(255,77,79,0.22)',
  color: '#ffe0dc',
  fontWeight: 600,
};

const safeNoticeStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: 16,
  background: 'rgba(82,196,26,0.1)',
  border: '1px solid rgba(82,196,26,0.22)',
  color: '#e4ffe8',
  fontWeight: 600,
};
