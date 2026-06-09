import Link from 'next/link';

export default function VerifyIndexPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        background:
          'radial-gradient(circle at top, rgba(250,173,20,0.22), transparent 28%), linear-gradient(180deg, #11131a 0%, #07080b 100%)',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 720,
          borderRadius: 32,
          border: '1px solid rgba(247,215,116,0.18)',
          background: 'rgba(9, 12, 18, 0.88)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.46)',
          padding: 24,
        }}
      >
        <h1 style={{ color: '#fff', marginTop: 0 }}>Verificación de credenciales</h1>
        <p style={{ color: 'rgba(245,241,232,0.72)', lineHeight: 1.6 }}>
          Usa el QR de la credencial para entrar directo al registro correcto. Si el QR no funciona, abre el enlace manual usando el código visible.
        </p>

        <form
          action="/verificar/manual"
          method="GET"
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            marginTop: 18,
          }}
        >
          <input
            name="code"
            placeholder="LNN-XXXXXXX"
            style={{
              flex: '1 1 260px',
              minHeight: 46,
              borderRadius: 16,
              border: '1px solid rgba(247,215,116,0.16)',
              background: 'rgba(12,16,23,0.84)',
              color: '#fff',
              padding: '0 14px',
              fontSize: 15,
            }}
          />
          <button
            type="submit"
            style={{
              minHeight: 46,
              borderRadius: 16,
              border: '1px solid rgba(247,215,116,0.16)',
              background: '#f7d774',
              color: '#11131a',
              padding: '0 18px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Buscar código
          </button>
        </form>

        <div style={{ marginTop: 18 }}>
          <Link href="/" style={{ color: '#f7d774', fontWeight: 700, textDecoration: 'none' }}>
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
