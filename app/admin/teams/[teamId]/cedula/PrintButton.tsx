'use client';

import Link from 'next/link';

import styles from './cedula.module.css';

export default function PrintButton() {
  return (
    <div className={styles['cedula-print-toolbar']}>
      <Link className={styles['cedula-secondary-action']} href="/admin/teams">
        Volver a equipos
      </Link>
      <button className={styles['cedula-print-button']} type="button" onClick={() => window.print()}>
        Imprimir / Descargar PDF
      </button>
    </div>
  );
}
