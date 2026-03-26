import type { Metadata } from 'next';
import './globals.css';
import AntdProvider from './components/AntdProvider';

export const metadata: Metadata = {
  title: 'Liga Municipal de Básquetbol – Nochixtlán',
  description: 'Sistema de gestión de la Liga Municipal de Básquetbol de Nochixtlán. Posiciones, estadísticas y calendario.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
