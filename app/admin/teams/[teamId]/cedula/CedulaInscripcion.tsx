import Image from 'next/image';

import CedulaHeader from './CedulaHeader';
import PlayerCedulaCard from './PlayerCedulaCard';
import PrintButton from './PrintButton';
import styles from './cedula.module.css';
import type { CedulaInscripcionData } from './types';

interface CedulaInscripcionProps {
  data: CedulaInscripcionData;
}

export default function CedulaInscripcion({ data }: CedulaInscripcionProps) {
  const splitIndex = Math.ceil(data.jugadores.length / 2);
  const leftColumn = data.jugadores.slice(0, splitIndex);
  const rightColumn = data.jugadores.slice(splitIndex, 14);

  return (
    <main className={styles['cedula-page-shell']}>
      <PrintButton />

      <section className={styles['cedula-sheet']} aria-label="Cedula de inscripcion de basquetbol">
        <div className={styles['cedula-watermark']} aria-hidden="true">
          LMB
        </div>
        <CedulaHeader equipo={data.equipo} temporada={data.temporada} />

        <section className={styles['cedula-roster']} aria-label="Lista de jugadores">
          <div className={styles['cedula-roster-column']}>
            {leftColumn.map((jugador, index) => (
              <PlayerCedulaCard key={`left-${index}`} index={index} jugador={jugador} />
            ))}
          </div>
          <div className={styles['cedula-roster-column']}>
            {rightColumn.map((jugador, index) => (
              <PlayerCedulaCard key={`right-${index}`} index={index + splitIndex} jugador={jugador} />
            ))}
          </div>
        </section>

        <footer className={styles['cedula-footer']}>
          <div className={styles['cedula-signature-block']}>
            <div className={styles['cedula-signature-line']} />
            <span>Firma del responsable del equipo</span>
          </div>
          <div className={styles['cedula-signature-block']}>
            <Image
              alt="Firma de presidencia de la liga"
              className={styles['cedula-president-signature']}
              src="/cedula/firma-presidente.png"
              width={120}
              height={54}
              priority
            />
            <div className={styles['cedula-signature-line']} />
            <span>Presidencia de la liga</span>
            <small>Firma y sello</small>
          </div>
        </footer>
      </section>
    </main>
  );
}
