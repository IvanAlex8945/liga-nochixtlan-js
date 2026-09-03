import Image from 'next/image';

import styles from './cedula.module.css';
import type { CedulaJugador } from './types';

interface PlayerCedulaCardProps {
  index: number;
  jugador: CedulaJugador;
}

export default function PlayerCedulaCard({ index, jugador }: PlayerCedulaCardProps) {
  const initials = getInitials(jugador.nombre);

  return (
    <article className={styles['cedula-player-card']}>
      <div className={styles['cedula-player-index']}>{String(index + 1).padStart(2, '0')}</div>
      <div className={styles['cedula-photo-box']}>
        {jugador.foto_url ? (
          <Image
            alt={`Foto de ${jugador.nombre}`}
            src={jugador.foto_url}
            width={72}
            height={82}
            unoptimized
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <div className={styles['cedula-player-info']}>
        <span className={styles['cedula-field-label']}>Nombre del jugador</span>
        <strong>{jugador.nombre || '\u00a0'}</strong>
        <div className={styles['cedula-player-number-row']}>
          <span className={styles['cedula-field-label']}>Numero</span>
          <b>{jugador.numero ?? '\u00a0'}</b>
        </div>
      </div>
    </article>
  );
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials || 'FOTO';
}
