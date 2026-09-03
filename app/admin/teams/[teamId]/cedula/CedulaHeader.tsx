import type { CedulaEquipo } from './types';
import styles from './cedula.module.css';

interface CedulaHeaderProps {
  equipo: CedulaEquipo;
  temporada: string;
}

export default function CedulaHeader({ equipo, temporada }: CedulaHeaderProps) {
  return (
    <header className={styles['cedula-header']}>
      <div className={styles['cedula-logo']} aria-hidden="true">
        <span>🏀</span>
      </div>
      <div className={styles['cedula-title-block']}>
        <p className={styles['cedula-kicker']}>LIBERTAD, SALUD Y DEPORTE</p>
        <h1>LIGA MUNICIPAL DE BASQUETBOL</h1>
        <h2>NOCHIXTLAN, OAXACA</h2>
      </div>
      <div className={styles['cedula-season']}>
        <span>Temporada</span>
        <strong>{temporada || 'Sin temporada'}</strong>
      </div>
      <div className={styles['cedula-rule']} />
      <section className={styles['cedula-meta']} aria-label="Datos generales del equipo">
        <div>
          <span>Categoria</span>
          <strong>{equipo.categoria || 'Sin categoria'}</strong>
        </div>
        <div>
          <span>Equipo</span>
          <strong>{equipo.nombre || 'Sin equipo'}</strong>
        </div>
        <div>
          <span>Capitan</span>
          <strong>{equipo.capitan || 'Pendiente'}</strong>
        </div>
        <div>
          <span>Celular</span>
          <strong>{equipo.telefono || 'Pendiente'}</strong>
        </div>
      </section>
    </header>
  );
}
