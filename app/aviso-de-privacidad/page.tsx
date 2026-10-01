import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Aviso de Privacidad Integral – Liga Municipal de Básquetbol Nochixtlán',
  description:
    'Aviso de Privacidad Integral y directrices oficiales para la protección de datos personales, fotografías, credenciales digitales y estadísticas de la Liga Municipal de Básquetbol de Asunción Nochixtlán, Oaxaca.',
};

export default function AvisoPrivacidadPage() {
  return (
    <div style={pageContainerStyle}>
      {/* Glow de ambientación superior */}
      <div style={ambientGlowStyle} />

      <main style={mainContentStyle}>
        {/* Barra superior de navegación */}
        <nav style={navBarStyle}>
          <Link href="/" style={backLinkStyle}>
            <span style={{ fontSize: 16 }}>←</span> Volver al portal oficial
          </Link>
          <span style={officialBadgeStyle}>
            ⚖️ Documento Oficial Vigente
          </span>
        </nav>

        {/* Encabezado del documento */}
        <header style={headerStyle}>
          <div style={pretitleStyle}>
            <span>🏀</span> COMITÉ DIRECTIVO · ASUNCIÓN NOCHIXTLÁN, OAXACA
          </div>
          <h1 style={titleStyle}>
            Aviso de Privacidad Integral y Términos de Protección de Datos Deportivos
          </h1>
          <p style={subtitleStyle}>
            En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), este documento establece los términos bajo los cuales se recaba, resguarda y procesa la información de jugadores, delegados, árbitros y personal de mesa en la Liga Municipal de Básquetbol de Asunción Nochixtlán.
          </p>
          <div style={metaBarStyle}>
            <span><strong>Jurisdicción:</strong> Estados Unidos Mexicanos (Oaxaca)</span>
            <span>·</span>
            <span><strong>Última actualización:</strong> Octubre de 2026</span>
          </div>
        </header>

        {/* Tarjetas resumen de garantías */}
        <section style={guaranteesGridStyle}>
          <div style={guaranteeCardStyle}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🛡️</div>
            <div style={guaranteeTitleStyle}>Fines Exclusivamente Deportivos</div>
            <div style={guaranteeTextStyle}>
              Toda la información y registros se emplean únicamente para la organización del torneo, cédulas y estadísticas.
            </div>
          </div>
          <div style={guaranteeCardStyle}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📸</div>
            <div style={guaranteeTitleStyle}>Uso Legítimo de Imagen</div>
            <div style={guaranteeTextStyle}>
              Las fotografías se utilizan exclusivamente para la credencialización oficial, control arbitral y difusión deportiva.
            </div>
          </div>
          <div style={guaranteeCardStyle}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🚫</div>
            <div style={guaranteeTitleStyle}>Cero Comercialización</div>
            <div style={guaranteeTextStyle}>
              No compartimos, vendemos ni alquilamos bases de datos a marcas, comercios ni intermediarios publicitarios.
            </div>
          </div>
          <div style={guaranteeCardStyle}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>👶</div>
            <div style={guaranteeTitleStyle}>Blindaje a Menores de Edad</div>
            <div style={guaranteeTextStyle}>
              La participación de menores requiere la autorización expresa y firmada de los padres o tutores legales.
            </div>
          </div>
        </section>

        {/* Articulado completo y estructurado */}
        <article style={documentBodyStyle}>
          {/* Sección 1 */}
          <section style={sectionBlockStyle}>
            <h2 style={sectionHeadingStyle}>1. Identidad y Domicilio del Responsable</h2>
            <p style={paragraphStyle}>
              El Comité Organizador y Directivo de la <strong>Liga Municipal de Básquetbol de Asunción Nochixtlán</strong> (en lo sucesivo, <em>«La Liga»</em>), con sede y actividad deportiva en el municipio de Asunción Nochixtlán, Oaxaca, México, es el responsable legítimo del uso, resguardo, confidencialidad y tratamiento de los datos personales proporcionados a través del sitio web oficial y de los formatos físicos de inscripción y cédula.
            </p>
          </section>

          {/* Sección 2 */}
          <section style={sectionBlockStyle}>
            <h2 style={sectionHeadingStyle}>2. Datos Personales Sujetos a Tratamiento</h2>
            <p style={paragraphStyle}>
              Para posibilitar la competencia deportiva, control arbitral y publicación de resultados, La Liga recaba y procesa las siguientes categorías de datos:
            </p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong>Datos de Identificación y Registro:</strong> Nombre completo del jugador o delegado, número de camiseta (dorsal), equipo deportivo, rama (varonil, femenil o mixta) y categoría deportiva asignada.
              </li>
              <li style={listItemStyle}>
                <strong>Datos de Imagen y Fotografía:</strong> Fotografía digital del rostro del participante, requerida para la emisión de la credencial oficial de juego y el formato de cédula de inscripción.
              </li>
              <li style={listItemStyle}>
                <strong>Datos de Rendimiento y Actividad Deportiva:</strong> Puntos anotados, canastas de tres puntos encestadas, faltas cometidas, asistencias a partidos, minutos de juego, reportes de actas arbitrales y estatus de elegibilidad reglamentaria para la fase de postemporada (liguilla).
              </li>
              <li style={listItemStyle}>
                <strong>Datos Técnicos de Seguridad (Uso interno restringido):</strong> Correo electrónico y credenciales de autenticación correspondientes exclusivamente al personal administrativo, árbitros y mesa de control facultados para operar el sistema.
              </li>
            </ul>
          </section>

          {/* Sección 3 */}
          <section style={sectionBlockStyle}>
            <h2 style={sectionHeadingStyle}>3. Finalidades del Tratamiento de la Información</h2>
            <p style={paragraphStyle}>
              Los datos personales recabados son indispensables para cumplir con las siguientes finalidades primarias:
            </p>
            <ol style={orderedListStyle}>
              <li style={listItemStyle}>
                Gestionar la inscripción reglamentaria de los clubes y sus plantillas de jugadores en la temporada correspondiente.
              </li>
              <li style={listItemStyle}>
                Emitir e imprimir las cédulas oficiales de registro para la acreditación en asambleas y previo a los partidos.
              </li>
              <li style={listItemStyle}>
                Generar credenciales digitales e impresas provistas de un código QR y código alfanumérico único para la verificación de autenticidad y elegibilidad en cancha ante los árbitros y anotadores.
              </li>
              <li style={listItemStyle}>
                Capturar los resultados de cada encuentro y alimentar en tiempo real la tabla general de posiciones, la tabla de goleo individual y el ranking de mejores tripleros.
              </li>
              <li style={listItemStyle}>
                Verificar el cumplimiento del criterio de asistencia mínima por jugador para clasificar a playoffs (liguilla) y garantizar el juego limpio.
              </li>
            </ol>
          </section>

          {/* Sección 4 */}
          <section style={sectionBlockStyle}>
            <h2 style={sectionHeadingStyle}>4. Autorización y Consentimiento de Imagen Deportiva</h2>
            <p style={paragraphStyle}>
              Al inscribirse voluntariamente en la competición y remitir su fotografía a través del delegado de equipo, el participante otorga su consentimiento libre e informado para que su imagen, nombre y estadísticas sean difundidos en los medios oficiales de La Liga (sitio web, redes sociales institucionales y cartelera deportiva).
            </p>
            <p style={paragraphStyle}>
              Dicha autorización se confiere de manera no exclusiva y exclusivamente para fines informativos, de identidad deportiva y difusión comunitaria del torneo. La Liga tiene estrictamente prohibido lucrar, comercializar o ceder las imágenes para fines publicitarios de marcas no autorizadas.
            </p>
          </section>

          {/* Sección 5 */}
          <section style={sectionBlockStyle}>
            <h2 style={sectionHeadingStyle}>5. Protección Especial de Menores de Edad</h2>
            <p style={paragraphStyle}>
              En atención al interés superior de la niñez y adolescencia establecido en las leyes mexicanas:
            </p>
            <div style={calloutBoxStyle}>
              <p style={{ margin: 0 }}>
                <strong>Obligación del Delegado o Capitán:</strong> Todo registro de un jugador menor de 18 años presupone obligatoriamente que el delegado del club cuenta con la autorización expresa y por escrito (carta responsiva o firma en cédula) de los padres o tutores legales del menor. La entrega de la documentación ante La Liga acredita la existencia de dicho consentimiento legal.
              </p>
            </div>
            <p style={paragraphStyle}>
              Los padres o tutores legales podrán en cualquier momento solicitar la revisión, actualización o revocación de los datos e imagen de su representado conforme a los mecanismos previstos en este aviso.
            </p>
          </section>

          {/* Sección 6 */}
          <section style={sectionBlockStyle}>
            <h2 style={sectionHeadingStyle}>6. Infraestructura Tecnológica, Cifrado y Proveedores</h2>
            <p style={paragraphStyle}>
              La Liga garantiza que la información digital se encuentra protegida mediante estándares de la industria, transmitida bajo protocolos seguros HTTPS/SSL y respaldada por servicios de nube de alta confiabilidad:
            </p>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong>Base de datos relacional y autenticación:</strong> Gestionada en servidores seguros de <em>Supabase</em> con control de accesos por roles (RBAC).
              </li>
              <li style={listItemStyle}>
                <strong>Almacenamiento y optimización de imágenes:</strong> Hospedado en los servidores de <em>Cloudinary</em> bajo identificadores cifrados.
              </li>
              <li style={listItemStyle}>
                <strong>Despliegue y entrega web:</strong> Alojado en la infraestructura global de <em>Vercel</em> con aislamiento de red y protección perimetral.
              </li>
            </ul>
          </section>

          {/* Sección 7 */}
          <section style={sectionBlockStyle}>
            <h2 style={sectionHeadingStyle}>7. Conservación de Registros y Estadísticas Históricas</h2>
            <p style={paragraphStyle}>
              Las fotografías y datos de contacto de jugadores que causen baja temporal o definitiva del torneo son desactivados para la emisión de credenciales vigentes.
            </p>
            <p style={paragraphStyle}>
              No obstante, <strong>los registros estadísticos, marcadores y nombres asentados en las actas de partidos concluidos forman parte de la memoria histórica deportiva de la competición</strong>. Para preservar la certeza y veracidad de los torneos finalizados, dichos datos históricos no son sujetos de eliminación retroactiva que altere el historial oficial de la liga.
            </p>
          </section>

          {/* Sección 8 */}
          <section style={sectionBlockStyle}>
            <h2 style={sectionHeadingStyle}>8. Ejercicio de Derechos ARCO</h2>
            <p style={paragraphStyle}>
              Cualquier titular de datos personales (o su representante legal) tiene derecho a ejercer sus derechos de <strong>Acceso, Rectificación, Cancelación y Oposición (ARCO)</strong>:
            </p>
            <ul style={listStyle}>
              <li style={listItemStyle}><strong>Acceso:</strong> Conocer los datos registrados en el padrón de la liga.</li>
              <li style={listItemStyle}><strong>Rectificación:</strong> Corregir ortografía, número de camiseta, nombre o fotografía errónea.</li>
              <li style={listItemStyle}><strong>Cancelación:</strong> Solicitar la baja de su credencial vigente al concluir o retirarse del torneo.</li>
              <li style={listItemStyle}><strong>Oposición:</strong> Oponerse al tratamiento de sus datos para finalidades no indispensables.</li>
            </ul>
            <p style={paragraphStyle}>
              Para ejercer cualquiera de estos derechos, el interesado puede presentar su solicitud directamente ante la Mesa Directiva durante las reuniones ordinarias de la liga o mediante solicitud escrita al canal de atención oficial:
            </p>
            <div style={contactBoxStyle}>
              <div><strong>Canal de Atención de Privacidad:</strong></div>
              <div style={{ color: 'var(--oro-cantera)', fontWeight: 700, marginTop: 4 }}>
                contacto.liganochixtlan@gmail.com
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                O bien con la Mesa Directiva en el Auditorio o Cancha Municipal durante las jornadas deportivas.
              </div>
            </div>
          </section>

          {/* Sección 9 */}
          <section style={sectionBlockStyle}>
            <h2 style={sectionHeadingStyle}>9. Validez de las Credenciales Digitales y Deslinde Deportivo</h2>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong>Credencial Intransferible:</strong> La credencial física o digital emitida por este sistema es de uso estrictamente personal. La suplantación de identidad, adulteración de códigos QR o falsificación de códigos de verificación constituye una falta grave sancionada de acuerdo con el Reglamento General de Competencia.
              </li>
              <li style={listItemStyle}>
                <strong>Deslinde Médico y Físico:</strong> La Liga y los operadores de esta plataforma fungen como organizadores deportivos. La práctica del baloncesto implica esfuerzo físico y riesgo de lesiones inherentes a la actividad deportiva amateur, por lo que cada jugador y equipo asume la responsabilidad de su aptitud física y médica para competir.
              </li>
            </ul>
          </section>

          {/* Sección 10 */}
          <section style={sectionBlockStyle}>
            <h2 style={sectionHeadingStyle}>10. Modificaciones y Actualizaciones</h2>
            <p style={paragraphStyle}>
              La Liga se reserva el derecho de modificar o complementar este Aviso de Privacidad en cualquier momento para adaptarlo a nuevas disposiciones legales, reglamentarias o tecnológicas. Cualquier modificación sustancial será comunicada a los delegados de equipo y publicada de manera visible en esta misma sección del portal web oficial.
            </p>
          </section>
        </article>

        {/* Pie de página institucional */}
        <footer style={footerStyle}>
          <div>
            © {new Date().getFullYear()} Liga Municipal de Básquetbol Nochixtlán · Todos los derechos reservados.
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link href="/" style={footerLinkStyle}>
              🏀 Inicio
            </Link>
            <Link href="/admin" style={footerLinkStyle}>
              ⚙ Panel Administrativo
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ESTILOS EN LÍNEA BASADOS EN EL SISTEMA DE DISEÑO DE LA LIGA
   ───────────────────────────────────────────────────────────── */

const pageContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#04060a',
  color: '#f8fafc',
  fontFamily: 'var(--font-family-sans, sans-serif)',
  position: 'relative',
  overflowX: 'hidden',
  padding: '24px 16px 64px',
};

const ambientGlowStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  width: '100%',
  maxWidth: 1200,
  height: 380,
  background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(245, 158, 11, 0.15), transparent 70%)',
  pointerEvents: 'none',
  zIndex: 0,
};

const mainContentStyle: React.CSSProperties = {
  maxWidth: 920,
  margin: '0 auto',
  position: 'relative',
  zIndex: 1,
};

const navBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 32,
  flexWrap: 'wrap',
  gap: 12,
};

const backLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  color: 'var(--oro-cantera, #fde68a)',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 700,
  padding: '8px 14px',
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  transition: 'all 0.2s ease',
};

const officialBadgeStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--oro-mixteco, #f59e0b)',
  background: 'rgba(245, 158, 11, 0.1)',
  border: '1px solid rgba(245, 158, 11, 0.25)',
  padding: '4px 12px',
  borderRadius: 9999,
  letterSpacing: '0.04em',
};

const headerStyle: React.CSSProperties = {
  marginBottom: 36,
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  paddingBottom: 28,
};

const pretitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: '0.14em',
  color: 'var(--oro-cantera, #fde68a)',
  textTransform: 'uppercase',
  marginBottom: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const titleStyle: React.CSSProperties = {
  fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)',
  fontWeight: 800,
  lineHeight: 1.15,
  color: '#ffffff',
  margin: '0 0 16px',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 'clamp(14px, 1.2vw, 16px)',
  lineHeight: 1.6,
  color: '#cbd5e1',
  margin: '0 0 16px',
};

const metaBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  fontSize: 13,
  color: '#94a3b8',
  flexWrap: 'wrap',
};

const guaranteesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 14,
  marginBottom: 36,
};

const guaranteeCardStyle: React.CSSProperties = {
  background: 'rgba(18, 24, 36, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 12,
  padding: '16px 14px',
};

const guaranteeTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: '#ffffff',
  marginBottom: 6,
};

const guaranteeTextStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  color: '#94a3b8',
};

const documentBodyStyle: React.CSSProperties = {
  background: 'rgba(12, 16, 24, 0.85)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 16,
  padding: 'clamp(20px, 4vw, 36px)',
  boxShadow: '0 16px 36px -8px rgba(0, 0, 0, 0.7)',
};

const sectionBlockStyle: React.CSSProperties = {
  marginBottom: 32,
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  paddingBottom: 28,
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 'clamp(1.15rem, 1.8vw, 1.35rem)',
  fontWeight: 800,
  color: 'var(--oro-cantera, #fde68a)',
  margin: '0 0 14px',
  letterSpacing: '0.01em',
};

const paragraphStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: '#e2e8f0',
  margin: '0 0 14px',
};

const listStyle: React.CSSProperties = {
  paddingLeft: 22,
  margin: '0 0 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const orderedListStyle: React.CSSProperties = {
  paddingLeft: 22,
  margin: '0 0 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const listItemStyle: React.CSSProperties = {
  fontSize: 14.5,
  lineHeight: 1.6,
  color: '#cbd5e1',
};

const calloutBoxStyle: React.CSSProperties = {
  background: 'rgba(245, 158, 11, 0.08)',
  borderLeft: '4px solid var(--oro-mixteco, #f59e0b)',
  borderRadius: '0 8px 8px 0',
  padding: '14px 16px',
  margin: '16px 0',
  fontSize: 14,
  lineHeight: 1.6,
  color: '#fde68a',
};

const contactBoxStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 10,
  padding: '16px 18px',
  marginTop: 14,
};

const footerStyle: React.CSSProperties = {
  marginTop: 48,
  paddingTop: 24,
  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 16,
  fontSize: 13,
  color: '#94a3b8',
};

const footerLinkStyle: React.CSSProperties = {
  color: 'var(--oro-cantera, #fde68a)',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 13,
};
